import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

if not firebase_admin._apps:

    if "FIREBASE_CREDENTIALS" in os.environ:
        firebase_creds = json.loads(
            os.environ["FIREBASE_CREDENTIALS"]
        )

        cred = credentials.Certificate(firebase_creds)

    else:
        cred = credentials.Certificate(
            os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                "firebase-admin-key.json"
            )
        )

    firebase_admin.initialize_app(cred)

db = firestore.client()