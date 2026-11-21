# Hokie Trade

A marketplace made only for verified Virginia Tech students to buy, sell, and trade textbooks, course supplies, dorm gear, and peer services (like tutoring). Listings can be searched by course number, and the app has in-app messaging, ratings, and suggested safe on-campus meetup spots.

**Course:** CS 3704, Project 2 (Fall 2026) | **Team:** Trade

## Team

| Name | Email |
|---|---|
| Colin Michael | rcolinmichael@vt.edu |
| Tristan Livingood | tscottlivingood3@vt.edu |
| William Tran | wllamtrn@vt.edu |
| Siddharth Madireddy | sidm@vt.edu |

## The Problem

VT students trade things with each other all the time, but they use general apps and group chats (Facebook Marketplace, GroupMe, Instagram) that never confirm the other person is a student and are not organized around classes. In our survey (12 responses), students rated trust in strangers on general marketplace apps at 2.25 out of 5 on average, and their biggest worry was getting scammed.

## What Hokie Trade Does

- Sign up with an `@vt.edu` email and a verification code
- Search listings by course number (for example, "CS 3704")
- View a listing and its verified seller
- Message the seller inside the app
- Propose a campus meetup location, date, and time from the conversation's **Meeting** tab
- Review, accept, or suggest changes to a meetup in the Meeting tab, with a read-only record in Chat
- Rate the trade afterward

## Project Status

This is a **working prototype** built with React Native, Expo, and TypeScript. It runs on a real phone through Expo Go. It uses **mock data** stored in memory: conversations and meetups survive moving between screens, but reset when the app reloads. Email verification is simulated and ordinary text messages receive scripted replies. The chat's **Buyer / Seller** demo switch lets one person try both sides of a meetup; it does not connect two real accounts. See the [open issues](../../issues) for known bugs and the features we would add with more time.

Our design documents describe the full system we plan to build (Next.js, TypeScript, and Firebase). They are in this repository:

- [PRODUCT.md](PRODUCT.md) – requirements, survey findings, and user stories
- [SYSTEM.md](SYSTEM.md) – planned architecture and data model

## How to Run It

### What you need

- [Node.js](https://nodejs.org) (LTS) and npm
- [Git](https://git-scm.com)
- The **Expo Go** app on your phone (App Store or Google Play)
- Your phone and computer on the **same Wi-Fi network**

### Steps

```bash
git clone https://github.com/TristanLivingood/Hokie_Trade
cd Hokie_Trade
npm install
npx expo start
```

1. A QR code will show in your terminal.
2. **iPhone:** scan it with the Camera app. **Android:** open Expo Go and tap "Scan QR code."
3. The app opens in Expo Go.

### Try the main flow

1. Enter an email ending in `@vt.edu` and tap **Send code**, then enter any 6 digits and tap **Verify**.
2. Type `CS 3704` in the search box.
3. Open the textbook listing and tap **Contact Seller**.
4. Send a message, then tap **Trade complete** and leave a rating.

### Try meetup scheduling

1. Open any listing and tap **Contact Seller**. The conversation opens on the **Chat** tab.
2. Switch to the **Meeting** tab and tap **Propose meetup**. While no plan exists the Meeting tab shows "No meetup planned yet".
3. Choose Newman Library, Squires Student Center, or the Drillfield. Choose a future date and enter a 24-hour time, such as `15:30` for 3:30 PM. All meetup times use **Eastern time in Blacksburg**, even if the phone is in another time zone.
4. Tap **Send proposal**. The Meeting tab shows the pending proposal and Chat shows a structured, read-only meetup card with **View in Meeting**.
5. Switch to **Seller** in the demo bar. The Meeting tab shows an **action needed** badge on the tab; open it and tap **Accept meetup**, or tap **Suggest change**, change the location/date/time, and send a new proposal. Switch back to **Buyer** to accept the seller's counterproposal.
6. After acceptance, the confirmed details sit at the top of the Meeting tab. Use **Change meetup** to propose a new plan; the current agreement stays in effect and is labelled "Confirmed" until the other participant accepts the change.
7. The proposer can edit or withdraw a pending proposal; while one is pending the primary action is disabled and explains why. Replaced, withdrawn, and accepted cards cannot be accepted again. Past times and invalid dates are rejected, and a confirmed plan whose time has passed keeps its details with a "time has passed" notice.
8. Type a message in Chat, switch to Meeting, then switch back: your unsent draft is still there.
9. Open another listing to see a separate conversation, then return to the first listing to see its saved meetup state (the conversation reopens on Chat).

Meetup locations are suggestions, not an official safety endorsement. Meet in a public area during open hours.

### Troubleshooting

- **Phone cannot connect:** make sure your phone and computer are on the same Wi-Fi, and that your computer is not on a VPN.
- **Typing does not work in the Android emulator:** use a real phone with Expo Go instead.
- **A warning about `SafeAreaView` shows up:** it is only a deprecation notice and does not stop the app (tracked in the issues).
- **Updating from the earlier ZIP:** run `npm install` before starting. The package versions now match Expo SDK 58; the earlier upload mixed versions from different SDKs.

## Repository Layout

```
App.tsx                          Main screens, mock listings, per-listing conversations
src/meetups/MeetupChat.tsx        Conversation screen: header, demo roles, tabs, shared state
src/meetups/ConversationTabs.tsx  "Chat" | "Meeting" tabs with the action-needed badge
src/meetups/ChatPanel.tsx         Message timeline, read-only meetup cards, composer
src/meetups/MeetingPanel.tsx      Confirmed plan, pending proposal, empty state, actions
src/meetups/MeetupCard.tsx        Read-only meetup record shown in Chat
src/meetups/MeetupForm.tsx        Campus location/date/time form
src/meetups/model.ts              Conversation transitions and Eastern-time validation
src/meetups/meetingView.ts        Derived meeting view: available actions, status text, form defaults
src/meetups/viewState.ts          Presentation state: active tab and per-participant drafts
tests/meetups.test.cjs            Meetup behavior and date-validation tests
tests/meeting-tab.test.cjs        Meeting tab requirements tests (US-001 - US-004)
scripts/test-meetups.cjs          Test runner using the project's TypeScript compiler
index.ts                          Expo entry point
app.json                          Expo configuration
assets/                           App icons and images
PRODUCT.md                        Product requirements
SYSTEM.md                         Planned full-system design
```

## Development checks

```bash
npm run typecheck
npm run lint
npm test
```

The tests cover acceptance permissions, counterproposals, confirmed-plan preservation, withdrawal, stale actions, separate conversations, invalid dates, past times, and daylight-saving transitions. They also cover the Meeting tab's derived view: tab defaults, empty/pending/confirmed states, form defaults and prefill, disabled actions, the action-needed badge, and draft preservation across tab switches. Run the meetup flow on an iPhone or Android device to check keyboard behavior, native layout, and the screen-reader pass.

## AI Use

We used Claude and the course opencode agent template during this project. ChatGPT/Codex assisted with the meetup scheduling implementation and its tests. Details are in our final report.
