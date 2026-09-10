from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework import status

from firebase_admin import auth as firebase_auth

from .firebase_config import db
import json


def _get_caller(request):
    """
    Resolve the Firebase user behind the request.

    This backend talks to Firestore with admin credentials, which bypass every
    Firestore security rule, so an unauthenticated write here is a write with
    full privileges. Callers must present the Firebase ID token of a signed-in
    user as `Authorization: Bearer <idToken>`.

    Returns the decoded token, or None when the request is not authenticated.
    """
    header = request.META.get('HTTP_AUTHORIZATION', '')

    if not header.startswith('Bearer '):
        return None

    token = header[len('Bearer '):].strip()

    if not token:
        return None

    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        # Expired, malformed, revoked or wrong-project tokens all land here.
        return None


def _is_organizer(uid):
    """An event may only be created by someone with an `organizers` record."""
    try:
        snapshot = db.collection('organizers').document(uid).get()
    except Exception:
        return False

    return snapshot.exists


@api_view(['GET'])
def test_api(request):
    return Response({
        "message": "Backend Connected Successfully"
    })


@api_view(['GET'])
def get_events(request):
    # A Firestore outage or a credentials problem used to surface as an
    # unhandled 500 with a stack trace.
    try:
        docs = db.collection('events').stream()
    except Exception:
        return Response(
            {"error": "Could not load events"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    events = []

    for doc in docs:
        event = doc.to_dict() or {}
        event['id'] = doc.id
        events.append(event)

    return Response(events)


@api_view(['POST'])
def create_event(request):
    caller = _get_caller(request)

    if caller is None:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not _is_organizer(caller.get('uid')):
        return Response(
            {"error": "You are not permitted to create events"},
            status=status.HTTP_403_FORBIDDEN,
        )

    # The original client posted the payload as a JSON string under `_content`;
    # a normal JSON body is accepted too. Malformed input used to raise and
    # surface as an unhandled 500.
    raw_json = request.data.get('_content') if hasattr(request.data, 'get') else None

    if raw_json is not None:
        try:
            data = json.loads(raw_json)
        except (TypeError, ValueError):
            return Response(
                {"error": "Malformed JSON in '_content'"},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        data = request.data

    if not isinstance(data, dict):
        return Response(
            {"error": "Expected a JSON object"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    title = str(data.get("title") or "").strip()

    if not title:
        return Response(
            {"error": "'title' is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def text(field, limit=2000):
        return str(data.get(field) or "").strip()[:limit]

    def whole_number(field, default=0):
        try:
            return max(0, int(data.get(field, default)))
        except (TypeError, ValueError):
            return default

    event_data = {
        "title": title[:200],
        "date": text("date", 64),
        "venue": text("venue", 200),
        "capacity": whole_number("capacity"),
        "description": text("description"),
        "time": text("time", 64),
        "eventType": text("eventType", 32) or "solo",
        "teamSize": whole_number("teamSize", 1),
        "registrationOpen": bool(data.get("registrationOpen", True)),
        "imageUrl": text("imageUrl", 500),
        "createdBy": caller.get('uid'),
    }

    doc_ref = db.collection("events").document()
    doc_ref.set(event_data)

    return Response({
        "message": "Event Created Successfully",
        "eventId": doc_ref.id
    })
