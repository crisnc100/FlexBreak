# FlexBreak Privacy Policy — draft for owner review

**Not yet published.** This draft describes the app and backend changes prepared for the next release. The owner must confirm the release actually in use, provider settings and the publication date before replacing the public policy. Effective date: to be confirmed.

## Information used by FlexBreak

FlexBreak stores stretching routines, favorites, progress, streaks and settings on your device to provide its features. Some information from your app activity is also used in remote features described below. Local storage does not mean that all information stays on your device.

When you use the AI Wellness Coach, FlexBreak stores conversations, wellness memory, preferences and related usage information locally. Closing the chat does not delete all conversation records. To generate a response, the app sends your message and relevant context through its backend to AI services. Context can include recent exchanges, a name you supplied, language, time of day, remembered preferences or suggestions, and stretching progress such as level, streak, routine count, XP and frequently used body areas. Messages may contain sensitive information you choose to share.

AI requests use OpenRouter and its routed model providers, with Groq as another processing provider when needed. The same request or related context may reach more than one provider when a request is retried or continued. These services process the information to generate responses.

If you use voice input, the app requests microphone permission, records audio and sends it through the backend to Google Cloud Speech-to-Text for transcription. The resulting text can be used in the coach conversation. The app attempts to remove its temporary recording files after processing or cancellation. This local cleanup does not delete information already processed remotely.

Weather features use location coordinates. When you allow location access, the app can obtain and save your location locally and use device location services to look up place information. Coordinates used for current weather or forecasts are sent through the backend to OpenWeather.

## Backend, subscriptions and verification

FlexBreak uses Supabase for backend request processing and Google Firebase Authentication and Cloud Firestore for authentication and server records. The app can create an automatically assigned Firebase identity without asking you to create a conventional account. This identifier is not a guarantee of anonymity. Backend requests include an authentication token and time zone. Server records support usage limits, abuse prevention, time-zone handling and access to paid features.

Apple's App Store or Google Play processes subscription payments. FlexBreak sends purchase evidence to its backend and the relevant store to verify access, renewals and subscription status. Server records include subscription identifiers or purchase proofs, product and platform, status, dates and links to app identities. Valid restores can connect multiple installations to the same subscription. FlexBreak does not receive your payment-card details through these store purchase flows.

If you request work or school email verification, your email may be sent to ZeroBounce for validation. The backend stores verification information to apply the relevant benefit and prevent duplicate use. Redeeming a promotional or family code sends the code and supplied email to the backend; redemption records include the associated app identity, use and benefit details.

## Advertising

FlexBreak integrates Google Mobile Ads (AdMob) for banner, interstitial and rewarded advertising where available. Ad requests involve Google's advertising service and can involve device, network and advertising-related information handled by that service. The app requests non-personalized banner ads; this statement does not apply to every ad format and does not mean that ad requests transmit no information. Ad behavior also depends on the platform and provider settings.

## Storage, export and deletion

Local AI data controls let you export AI records by copying them to your clipboard, or delete AI conversations, wellness memory and settings from that device. Copying creates a separate copy that you control. AI deletion also cancels AI notifications and turns off the coach. Shared diagnostic error counts, which may include AI errors, remain. This control does not delete stretching progress, authentication, purchase records or server usage and verification records.

Local AI deletion does not erase information already processed by AI, speech, advertising or other service providers. Backend subscription, redemption and anti-abuse records are separate from local chat storage. FlexBreak does not currently promise automatic deletion of these categories after a fixed number of days. Provider retention and handling depend on their services, policies and applicable account settings; this policy does not promise that providers immediately delete requests or never retain them.

You can manage microphone and location permissions in your device settings. For questions or a data request, contact **flexbreakapp@gmail.com**, using the subject **Data Request** for export or deletion questions. We may need enough information to locate the relevant records; do not send payment-card details or raw purchase proofs by email. Local deletion alone is not a request to delete server records.

## Updates

We will identify the effective date when this policy is published and update the disclosure when the app's data practices change.
