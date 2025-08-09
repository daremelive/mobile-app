# Multi-Stream Participant Test

## Issue
Host can see themselves but cannot see participants who join the multi-stream.

## Root Cause Analysis

The problem is likely one of these:

1. **Participant not publishing tracks** - The guest joins the call but doesn't enable camera/mic
2. **Permission issues** - Camera/microphone permissions not granted 
3. **Call ID mismatch** - Host and participant joining different GetStream calls
4. **Timing issues** - Participant video not ready when host renders

## Debug Steps

1. **Check Console Logs**
   - Host side: Look for "🎥 Stream participants (HOST VIEW)" logs
   - Participant side: Look for "🎥 Participant Grid Debug" logs
   - Verify both show total participants > 1

2. **Verify Call IDs Match**
   - Both should use: `stream_${streamId}`
   - Check network logs for GetStream join calls

3. **Check Permissions**
   - Participant should see permission dialogs for camera/microphone
   - Look for "📱 Permissions status" logs

4. **Check Video Stream Status**
   - Look for "✅ Camera enabled successfully" logs
   - Verify hasVideo: true in participant details

## Quick Fix

If participants still don't appear:

1. **Force permission request in participant screen**
2. **Add delay after enabling camera before considering it ready**
3. **Use allParticipants instead of just activeVideo participants in layout**

## Expected Behavior

With 2 participants:
- Host sees split screen: themselves + guest
- Participant sees split screen: themselves + host
- Both sides show "Guest" and "You" labels

## Test Script

```javascript
// Add this to both screens for debugging
console.log('DEBUG PARTICIPANTS:', {
  allParticipants: participants.map(p => ({
    id: p.userId,
    name: p.name,
    isLocal: p.isLocalParticipant,
    hasVideo: !!p.videoStream,
    hasAudio: !!p.audioStream,
    publishedTracks: p.publishedTracks?.length || 0
  }))
});
```
