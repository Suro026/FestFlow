from django.urls import path
from .views import test_api, get_events

urlpatterns = [
    path('test/', test_api),
    path('events/', get_events),
]