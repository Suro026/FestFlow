import firebase_admin
from firebase_admin import credentials, firestore
import os

db = None

if not firebase_admin._apps:
    cred = credentials.Certificate(
        os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "firebase-admin-key.json"
        )
    )
    firebase_admin.initialize_app(cred)

db = firestore.client()