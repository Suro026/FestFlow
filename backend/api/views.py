from rest_framework.response import Response
from rest_framework.decorators import api_view

from .firebase_config import db
import json


@api_view(['GET'])
def test_api(request):
    return Response({
        "message": "Backend Connected Successfully"
    })


@api_view(['GET'])
def get_events(request):
    events_ref = db.collection('events')
    docs = events_ref.stream()

    events = []

    for doc in docs:
        event = doc.to_dict()
        event['id'] = doc.id
        events.append(event)

    return Response(events)
@api_view(['POST'])
def create_event(request):

    raw_json = request.data.get('_content')

    data = json.loads(raw_json)

    event_data = {
        "title": data.get("title"),
        "date": data.get("date"),
        "venue": data.get("venue"),
        "capacity": data.get("capacity"),
        "description": data.get("description"),
        "time": data.get("time"),
        "eventType": data.get("eventType"),
        "teamSize": data.get("teamSize"),
        "registrationOpen": data.get("registrationOpen"),
        "imageUrl": data.get("imageUrl")
    }

    doc_ref = db.collection("events").document()
    doc_ref.set(event_data)

    return Response({
        "message": "Event Created Successfully",
        "eventId": doc_ref.id
    })
