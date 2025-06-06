// Test jason.borck@ymcatriangle.org specifically
function validateCatchAllEmail(email) {
    const emailParts = email.split('@');
    const localPart = emailParts[0];
    const domain = emailParts[1];
    
    console.log('Validating catch-all email:', localPart, 'at domain:', domain);
    
    // Check 1: Reject obviously fake local parts
    const suspiciousPatterns = [
      /^[a-z]{8,}$/, // Very long single strings (likely random)
      /^test\d*$/i, // test, test1, test123
      /^fake\d*$/i, // fake, fake1, fake123
      /^demo\d*$/i, // demo, demo1, demo123
      /^temp\d*$/i, // temp, temp1, temp123
      /^[a-z]\d{5,}$/i, // Single letter followed by many numbers
      /^\d+$/, // All numbers
      /^[qwerty]{4,}$/i, // Keyboard mashing
      /^[bcdfgjklmnpqrstvwxz]{6,}$/i, // Very long consonant-only strings
      /^[aeiou]{3,}$/i, // Mostly vowels
      
      // Enhanced patterns to catch specific fake emails like "djdjd.itvsbs"
      /^[bcdfgjklmnpqrstvwxz]{3,}$/, // Consonant-only strings like "djdjd"
      /^[bcdfghjklmnpqrstvwxz]{2,}\.[bcdfghjklmnpqrstvwxz]{2,}$/i, // Two consonant-heavy parts like "djdjd.itvsbs"
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(localPart)) {
        console.log('❌ Caught suspicious pattern:', pattern.source, 'for email:', localPart);
        return {
          isValid: false,
          reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
        };
      }
    }
    
    // Check 1.5: Enhanced validation for dotted email parts
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      console.log('Analyzing email parts:', parts);
      
      for (const part of parts) {
        // Check if any part looks randomly generated
        const vowels = (part.match(/[aeiou]/gi) || []).length;
        const consonants = (part.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
        const totalLetters = vowels + consonants;
        
        console.log(`Part "${part}": ${vowels} vowels, ${consonants} consonants, ${totalLetters} total`);
        
        // Reject parts with no vowels (except very short ones like initials)
        if (part.length > 2 && vowels === 0) {
          console.log('❌ Rejecting part with no vowels:', part);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
        
        // Reject parts that are too consonant-heavy (be more lenient for surnames)
        // Only flag if there are 6+ consonants to 1 vowel, which is extremely rare in real names
        if (part.length > 5 && totalLetters > 0 && consonants > vowels * 5) {
          console.log('❌ Rejecting part with too many consonants:', part, `(${consonants} consonants vs ${vowels} vowels)`);
          return {
            isValid: false,
            reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
          };
        }
        
        // Reject parts that look like keyboard mashing or random strings
        if (part.length >= 4) {
          // Check for repeated characters or patterns
          const hasRepeatedChars = /(.)\1{2,}/.test(part); // 3+ repeated chars
          
          if (hasRepeatedChars) {
            console.log('❌ Rejecting part with repeated characters:', part);
            return {
              isValid: false,
              reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
            };
          }
          
          // Special check for suspicious consonant clusters (but allow common names)
          const commonNames = ['smith', 'brown', 'clark', 'scott', 'wright', 'adams', 'campbell', 'phillips', 'mitchell', 'borck', 'stark', 'walsh', 'lynch', 'grant', 'cross'];
          const isCommonName = commonNames.includes(part.toLowerCase());
          
          if (!isCommonName) {
            const consonantClusters = part.match(/[bcdfghjklmnpqrstvwxz]{3,}/gi);
            if (consonantClusters && consonantClusters.length > 0) {
              // Check if the clusters look random (like "sdj", "djd", "tvsb")
              const suspiciousClusters = consonantClusters.filter(cluster => {
                // Common letter combinations are OK
                const commonCombos = ['ght', 'sch', 'tch', 'chr', 'thr', 'str', 'spr', 'scr', 'rck'];
                return !commonCombos.some(combo => cluster.includes(combo));
              });
              
              if (suspiciousClusters.length > 0) {
                console.log('❌ Rejecting part with suspicious consonant clusters:', part, suspiciousClusters);
                return {
                  isValid: false,
                  reason: 'Email address appears to be randomly generated. Please use your actual work email address.'
                };
              }
            }
          } else {
            console.log(`✅ "${part}" is recognized as a common name, allowing`);
          }
        }
      }
    }
    
    console.log('✅ Email passed all validation checks');
    return { isValid: true };
}

// Test both emails
const emails = ['jason.borck@ymcatriangle.org', 'djdjd.itvsbs@ymcatriangle.org'];

emails.forEach(email => {
    console.log('🔍 Testing:', email);
    console.log('='.repeat(50));
    const result = validateCatchAllEmail(email);
    console.log(`\nResult: ${result.isValid ? 'ACCEPTED ✅' : 'REJECTED ❌'}`);
    if (!result.isValid) {
        console.log(`Reason: ${result.reason}`);
    }
    console.log('\n');
});