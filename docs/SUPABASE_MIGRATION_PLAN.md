# Supabase Migration Plan 🚀
## Moving from AsyncStorage + Firestore to Supabase

### 🎯 **Why Migrate Now?**

**Perfect Timing:**
- ✅ We're already building user verification infrastructure
- ✅ Supabase auth integrates perfectly with verification system
- ✅ Better to establish proper architecture early
- ✅ User data is still relatively simple to migrate

**Benefits:**
- 🔐 **Built-in Authentication**: Email, OAuth, magic links
- 📊 **PostgreSQL Database**: More structured than Firestore
- ⚡ **Real-time Subscriptions**: Live verification status updates
- 🛡️ **Row Level Security**: Better data protection
- 📈 **Better Scaling**: Handles growth more efficiently

---

## 📋 **Migration Strategy**

### **Phase 1: Setup Supabase (Week 1)**

1. **Create Supabase Project**
   ```bash
   # Install Supabase CLI
   npm install -g @supabase/cli
   
   # Initialize project
   supabase init
   supabase start
   ```

2. **Design Database Schema**
   ```sql
   -- Users table (extends Supabase auth.users)
   CREATE TABLE public.user_profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     email TEXT NOT NULL,
     full_name TEXT,
     avatar_url TEXT,
     subscription_status TEXT DEFAULT 'free',
     verification_status TEXT DEFAULT 'unverified',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Verifications table
   CREATE TABLE public.verifications (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     type TEXT NOT NULL CHECK (type IN ('office', 'student')),
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
     email TEXT NOT NULL,
     company_name TEXT,
     work_arrangement TEXT CHECK (work_arrangement IN ('office', 'hybrid', 'remote')),
     days_in_office INTEGER,
     office_address TEXT,
     confidence_score INTEGER DEFAULT 0,
     auto_approved BOOLEAN DEFAULT FALSE,
     document_url TEXT,
     ai_analysis JSONB,
     location_data JSONB,
     rejection_reason TEXT,
     admin_notes TEXT,
     reviewed_by UUID REFERENCES auth.users(id),
     submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     reviewed_at TIMESTAMP WITH TIME ZONE
   );

   -- Subscriptions table
   CREATE TABLE public.subscriptions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     product_id TEXT NOT NULL,
     purchase_token TEXT,
     transaction_id TEXT,
     status TEXT NOT NULL DEFAULT 'active',
     discount_type TEXT,
     original_price DECIMAL(10,2),
     discounted_price DECIMAL(10,2),
     expires_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **Set Up Row Level Security**
   ```sql
   -- Enable RLS
   ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

   -- Policies
   CREATE POLICY "Users can view own profile" ON public.user_profiles
     FOR SELECT USING (auth.uid() = id);

   CREATE POLICY "Users can update own profile" ON public.user_profiles
     FOR UPDATE USING (auth.uid() = id);

   CREATE POLICY "Users can view own verifications" ON public.verifications
     FOR SELECT USING (auth.uid() = user_id);

   CREATE POLICY "Users can insert own verifications" ON public.verifications
     FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

### **Phase 2: Implement Supabase Services (Week 2)**

1. **Authentication Service**
   ```typescript
   // src/services/supabaseAuth.ts
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = 'YOUR_SUPABASE_URL';
   const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   
   export class SupabaseAuthService {
     async signUp(email: string, password: string, fullName: string) {
       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           data: { full_name: fullName }
         }
       });
       return { data, error };
     }
   
     async signIn(email: string, password: string) {
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password
       });
       return { data, error };
     }
   
     async signOut() {
       const { error } = await supabase.auth.signOut();
       return { error };
     }
   
     async getCurrentUser() {
       const { data: { user } } = await supabase.auth.getUser();
       return user;
     }
   }
   ```

2. **Verification Service (Updated)**
   ```typescript
   // Update existing verificationService.ts to use Supabase
   import { supabase } from './supabaseAuth';
   
   export class SupabaseVerificationService {
     async submitVerification(userId: string, verificationData: any) {
       const { data, error } = await supabase
         .from('verifications')
         .insert({
           user_id: userId,
           ...verificationData
         })
         .select()
         .single();
       
       return { data, error };
     }
   
     async getVerificationStatus(userId: string) {
       const { data, error } = await supabase
         .from('verifications')
         .select('*')
         .eq('user_id', userId)
         .order('submitted_at', { ascending: false })
         .limit(1)
         .single();
       
       return { data, error };
     }
   
     // Real-time verification status updates
     subscribeToVerificationUpdates(userId: string, callback: (data: any) => void) {
       return supabase
         .channel('verification_updates')
         .on('postgres_changes', {
           event: 'UPDATE',
           schema: 'public',
           table: 'verifications',
           filter: `user_id=eq.${userId}`
         }, callback)
         .subscribe();
     }
   }
   ```

### **Phase 3: Data Migration (Week 3)**

1. **Migration Script**
   ```typescript
   // scripts/migrateData.ts
   import AsyncStorage from '@react-native-async-storage/async-storage';
   import { supabase } from '../src/services/supabaseAuth';
   
   export async function migrateUserData() {
     try {
       // Get existing user data from AsyncStorage
       const userData = await AsyncStorage.getItem('user_data');
       const verificationData = await AsyncStorage.getItem('verification_status');
       
       if (userData) {
         const user = JSON.parse(userData);
         
         // Create user profile in Supabase
         const { error } = await supabase
           .from('user_profiles')
           .upsert({
             id: user.id,
             email: user.email,
             full_name: user.fullName,
             subscription_status: user.subscriptionStatus || 'free',
             verification_status: verificationData || 'unverified'
           });
         
         if (error) throw error;
         
         console.log('User data migrated successfully');
       }
     } catch (error) {
       console.error('Migration error:', error);
     }
   }
   ```

2. **Gradual Migration Strategy**
   - Keep AsyncStorage as fallback during transition
   - Migrate users on app launch
   - Sync data between both systems temporarily
   - Remove AsyncStorage after successful migration

### **Phase 4: Update App Components (Week 4)**

1. **Update Authentication Flow**
   ```typescript
   // Replace AsyncStorage auth with Supabase auth
   // Update login/signup screens
   // Add email verification flow
   ```

2. **Update Verification Modal**
   ```typescript
   // Use Supabase real-time subscriptions
   // Update verification status in real-time
   // Better error handling with Supabase
   ```

3. **Update Subscription Management**
   ```typescript
   // Store subscription data in Supabase
   // Better tracking of discounted purchases
   // Real-time subscription status updates
   ```

---

## 🔄 **Migration Timeline**

### **Week 1: Foundation**
- ✅ Set up Supabase project
- ✅ Design database schema
- ✅ Configure Row Level Security
- ✅ Set up development environment

### **Week 2: Implementation**
- ✅ Implement Supabase services
- ✅ Update verification system
- ✅ Add real-time subscriptions
- ✅ Test authentication flow

### **Week 3: Migration**
- ✅ Create migration scripts
- ✅ Migrate existing user data
- ✅ Implement dual-system support
- ✅ Test data consistency

### **Week 4: Integration**
- ✅ Update all app components
- ✅ Remove AsyncStorage dependencies
- ✅ Final testing and optimization
- ✅ Deploy to production

---

## 🛡️ **Risk Mitigation**

### **Data Safety**
- ✅ Keep AsyncStorage as backup during migration
- ✅ Implement rollback procedures
- ✅ Test migration with small user groups first
- ✅ Monitor for data loss or corruption

### **User Experience**
- ✅ Seamless migration (users won't notice)
- ✅ No re-authentication required
- ✅ Preserve all user preferences
- ✅ Maintain subscription status

### **Performance**
- ✅ Optimize database queries
- ✅ Implement proper indexing
- ✅ Use connection pooling
- ✅ Monitor response times

---

## 🎯 **Expected Benefits**

### **Immediate**
- 🔐 Better security with RLS
- ⚡ Real-time verification updates
- 📊 Better data structure
- 🛡️ Built-in authentication

### **Long-term**
- 📈 Better scalability
- 🔍 Advanced analytics
- 🤝 Team collaboration features
- 🌐 Multi-platform support

---

## 💡 **Recommendation**

**✅ DO IT NOW** as part of the verification update because:

1. **Perfect Timing**: We're already building user infrastructure
2. **Easier Migration**: Less user data to migrate now
3. **Better Architecture**: Proper foundation for future features
4. **Integrated Solution**: Verification + auth + database in one update

This sets up FlexBreak for long-term success with a scalable, secure, and feature-rich backend! 🚀 