# Card Transaction Flow

Secure card transactions using biometric authorization.

## Transaction Flow

1. User initiates payment in frontend.
2. System requests face scan (WebcamCapture).
3. AI verifies face against stored DID embedding.
4. If match, Backend calls Card Simulation (paymentSimulator).
5. Transaction result is updated in Database and returned to User.
