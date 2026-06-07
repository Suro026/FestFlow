from rest_framework.response import Response
from rest_framework.decorators import api_view

from .firebase_config import db


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