import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

if not firebase_admin._apps:

    if "FIREBASE_CREDENTIALS" in os.environ:
        try:
            firebase_creds = json.loads(
                os.environ["FIREBASE_CREDENTIALS"]
            )
        except ValueError as exc:
            raise RuntimeError(
                "FIREBASE_CREDENTIALS is set but is not valid JSON. It must "
                "contain the full service account key document."
            ) from exc

        cred = credentials.Certificate(firebase_creds)

    else:
        key_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "firebase-admin-key.json"
        )

        # Without this the failure is a bare FileNotFoundError raised during
        # module import, which Django reports as an opaque startup crash.
        if not os.path.exists(key_path):
            raise RuntimeError(
                "Firebase credentials not found. Set the FIREBASE_CREDENTIALS "
                "environment variable to the service account JSON, or place "
                f"the key file at {key_path}."
            )

        cred = credentials.Certificate(key_path)

    firebase_admin.initialize_app(cred)

db = firestore.client()