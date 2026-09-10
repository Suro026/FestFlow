from django.urls import path
from .views import test_api, get_events, create_event

urlpatterns = [
    path('test/', test_api),
    path('events/', get_events),
    path('create-event/', create_event),
]