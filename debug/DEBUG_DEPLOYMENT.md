# DEBUG DEPLOYMENT - Find What's Causing Synchronous Scanning

## The Mystery

Your code shows:
- ✅ "Background Virus Scanning" message
- ✅ No scanning imports in documents-formdata.ts
- ✅ No "before upload" or "60-120 seconds" text

But you're seeing:
- ❌ "Virus Scanning Required"
- ❌ "All 3 files will be scanned before upload (~90-180 seconds)"
- ❌ Actual 90-180 second wait

**This text literally doesn't exist in your codebase!**

## Possible Causes

1. **Multiple deployments** - You might have different domains/branches deployed
2. **Cached service worker** - Aggressive caching
3. **Different action being called** - Maybe there's another upload action
4. **Proxy/CDN cache** - Vercel edge cache not cleared
5. **Different file** - Maybe there's another form that uploads files

## Debug Strategy

Deploy these debug versions that log everything to console:

### Step 1: Deploy Debug Versions

```bash
# Replace with debug versions
cp debug/EditDocumentForm-DEBUG.tsx app/documents/[id]/edit/EditDocumentForm.tsx
cp debug/documents-formdata-DEBUG.ts app/actions/documents-formdata.ts

# Commit and deploy
git add app/documents/[id]/edit/EditDocumentForm.tsx app/actions/documents-formdata.ts
git commit -m "debug: Add extensive logging to file upload"
git push
```

### Step 2: Clear Everything Again

1. **Hard refresh:** Ctrl+Shift+R (multiple times)
2. **Clear site data:** 
   - Chrome: F12 → Application → Clear storage → Clear site data
3. **Close all tabs** of your app
4. **Restart browser**
5. **Open in incognito**

### Step 3: Test Upload

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Navigate to edit document page
4. **Look for the yellow DEBUG INFO box** at top of form:
   ```
   🐛 DEBUG INFO
   Component: EditDocumentForm.tsx
   Document ID: abc-123
   Files selected: 0
   Action: updateDocumentWithFiles
   ```
   
   **If you don't see this box:**
   - ❌ Debug version NOT deployed (old cached version still showing)
   - Try: `vercel --prod --force` to force redeploy

5. Select 2-3 files
6. **Before clicking Save**, check what the blue box says:
   - ✅ Should say: "Background Virus Scanning" and "in the background"
   - ❌ If it says: "Virus Scanning Required" and "before upload"
   - **Screenshot the box and console output**

7. Click "Save Changes"
8. Watch console logs

### Step 4: Analyze Console Logs

You should see logs like:

```
🐛 [EditDocumentForm] ========== FORM SUBMIT STARTED ==========
🐛 [EditDocumentForm] Files to upload: 3
🐛 [EditDocumentForm] Form action: updateDocumentWithFiles
🐛 [EditDocumentForm] Showing toast: Uploading 3 files...
🐛 [EditDocumentForm] Appending file 1: file1.pdf 675420
🐛 [EditDocumentForm] Appending file 2: file2.pdf 24340
🐛 [EditDocumentForm] Appending file 3: file3.pdf 812260
🐛 [EditDocumentForm] Calling updateDocumentWithFiles...
🔍 [documents-formdata] ========== ACTION CALLED ==========
🔍 [documents-formdata] Files to process: 3
🔍 [documents-formdata] *** NO SCANNING - MARKING AS PENDING ***
🔍 [documents-formdata] [1/3] Processing: file1.pdf
🔍 [documents-formdata] [1/3] Upload completed in 234ms
🔍 [documents-formdata] [1/3] Creating DB record with scan_status='pending'
🔍 [documents-formdata] [1/3] ✅ File queued for scanning
🔍 [documents-formdata] Total request duration: 2341ms
🐛 [EditDocumentForm] updateDocumentWithFiles completed in 2341 ms
🐛 [EditDocumentForm] ========== FORM SUBMIT ENDED ==========
```

**If you see something else**, especially:
- ❌ Logs mentioning "scanFile" or "VirusTotal"
- ❌ Logs showing 30-60 second durations per file
- ❌ Different action name being called

**Then we've found the problem!**

### Step 5: Check What's Different

If logs show different behavior:

1. **Check the action being called:**
   ```javascript
   // In the logs, look for:
   🐛 [EditDocumentForm] Form action: updateDocumentWithFiles
   
   // If it says something else, that's the problem!
   ```

2. **Check if scanning is happening:**
   ```javascript
   // Should see:
   🔍 [documents-formdata] *** NO SCANNING - MARKING AS PENDING ***
   
   // Should NOT see:
   🔍 [documents-formdata] Scanning with VirusTotal...
   ```

3. **Check timing:**
   ```javascript
   // Should be ~2-3 seconds total:
   🔍 [documents-formdata] Total request duration: 2341ms
   
   // Should NOT be 60+ seconds:
   🔍 [documents-formdata] Total request duration: 67890ms
   ```

## What We're Looking For

The debug logs will tell us:

1. **Which component is rendering?**
   - If no yellow DEBUG box → wrong file deployed
   - If box shows different info → something very weird

2. **Which action is being called?**
   - Should be: `updateDocumentWithFiles` from `documents-formdata.ts`
   - If different → we found another upload action

3. **What's the timing?**
   - Should be: ~2-3 seconds
   - If 60+ seconds → scanning is happening somewhere

4. **What does the UI say?**
   - Should be: "Background Virus Scanning"
   - If different → cached version or wrong file

## If Debug Versions Don't Deploy

If you still see old messages without debug:

1. **Check Vercel deployment logs** - did build succeed?
2. **Check build artifacts** - is the right code in production?
3. **Try different URL** - are you testing production vs preview?
4. **Check DNS** - are you hitting the right server?

## Send Me

After testing, send me:
1. Screenshot of the form (with yellow DEBUG box visible)
2. Console logs (full output)
3. Timing info (how long did it take?)
4. What the blue box said about scanning

This will tell us exactly what's happening!
