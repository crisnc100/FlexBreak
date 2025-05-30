** User shoudl be able to favorite stretch in recent routines ** Completed
** Recent routines doubles the duration for bilteral stretches (fix that) Completed
** New stretch routine - remove difficulty and replace with position - semi
** Add in transition period - can customize to more or less seconds - complete
** Add in new dynamic full body stretch - different than full body  whichh is a mix of all around. 
** New UI for the main routine generator
** be able to listen to music while stretching and doesnt pause. 
** Fix ciruclar timer - sometimes it doenst work
** Tease cusotm routines unlocked at level 5
** New premium stretch count is 14 - complete
** Second routine is same XP **
** any rouitne after second of the day will me a motivaital messages with 0xp but not showing 0 xp for the user


* Build and TEST 
   npx eas build --profile development --platform ios

* Deploy
Change buildl number in app.json
and use this command : npx eas-cli build --platform ios --profile testflight --clear-cache --non-interactive --no-wait

Final Production: 
npx eas-cli build --platform ios --profile production --clear-cache --non-interactive --no-wait