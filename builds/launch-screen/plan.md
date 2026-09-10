# Remove duplicate iOS launch logo

User sees square app icon before existing animated splash on build39. app.json explicitly configured native splash with potentialLogo2.png at 100px/white; IntroManager independently shows animated SplashScreen for returning users.

Change: native iOS splash uses #4776E6 background and an invisible transparent 1px PNG instead of a visible logo; IntroManager loading/container uses same blue. Existing onboarding and animated splash retained. Android native splash moves unchanged into platform override. No app icon change.

Bar: installed Expo plugin resolves iOS transparent image/blue; Android logo/white/100px unchanged; no extra startup delay or onboarding/streak behavior change. Independent read-only review required. Device appearance remains unverified until new native preview; native config changes do not alter installed build39.

Validated with installed getIosSplashConfig/getAndroidSplashConfig assertions. Installed applySplashScreenStoryboard explicitly removes SplashScreenLogo if image is absent, and withIosSplashAssets removes the old image set. No speculative iOS caching claim.


Clean-prebuild finding: Expo's no-image path leaves dangling EXPO-SplashScreen constraints and system-white background. A transparent PNG keeps its standard image/background construction intact. SVG was rejected by installed image-utils in disposable generation; no SVG is shipped. With PNG, clean prebuild succeeds and every storyboard constraint resolves to an existing ID; the container uses SplashScreenBackground colorset matching #4776E6. No generated iOS directories are committed.
