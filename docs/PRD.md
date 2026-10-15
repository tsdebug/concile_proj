# Concile Board: a simple task board

*Product requirements, written in plain language. Anyone should be able to read this and understand what we're building.*

---

## 1. What is this?

A small website where you keep your to-dos on a board, like Trello.

- The board has **columns** (for example: To Do, Doing, Done).
- Each column holds **cards** (one card = one task).
- You can drag a card from one column to another.
- You have your own account, so only you see your board.

Two things make it special:

1. **It updates live.** If you change something on your laptop, your phone shows the change a moment later, without refreshing.
2. **It keeps working with no internet.** You can keep adding and moving cards. When the internet comes back, everything syncs automatically.

## 2. Why are we building it?

This is a learning project. We want to understand **Concile**, an open-source backend (the "behind the scenes" part of an app: where data is stored, who can log in, and how updates reach every screen). Concile is similar to a tool called Convex, so at the end we'll write a Medium post: *"Concile: an alternative to Convex."*

The app itself is small on purpose. What matters most is what we learn and can honestly report: what was easy, what was confusing, what's missing.

## 3. Who is it for?

One kind of person: **someone who wants a simple personal task board.**

Throughout this document we'll follow an imaginary user called **Maya**.

## 4. What the app should do

### Must have (the first version)

**Account**
- Maya can create an account with an email and password.
- Maya can sign in and sign out.
- If she closes the tab and comes back later, she's still signed in.
- Only Maya can see Maya's board.

**Board**
- When Maya signs in for the first time, she gets a ready-made board with three columns: *To Do*, *Doing*, *Done*.
- She can add, rename and delete columns.
- She can add, edit and delete cards.
- She can drag cards up and down within a column, and across to other columns. The order stays the way she left it.

**Live updates**
- If Maya has the board open in two windows (or two devices), a change in one appears in the other within about a second, without refreshing.

**Works offline**
- With no internet, Maya can still add, edit, move and delete cards, and they change on screen immediately.
- A small badge always tells her the connection state: **Offline**, **Syncing**, or **Synced**.
- Changes made offline aren't lost, even if she refreshes the page. They're sent automatically once she's back online, and each change is applied only once.

### Nice to have (only if time allows)
- "Continue as guest" without an email, with the option to turn it into a real account later.
- A way to retry or dismiss a change that couldn't sync.
- Multiple boards, due dates, labels.

### Not included (on purpose, for now)
- Sharing a board with other people, comments, file attachments, search.
- Login with Google/GitHub, two-step verification, password reset emails.
- Putting the app on the public internet.

## 5. Everyday scenarios

These are the situations we want the app to handle well. They're also the stories we'll use to test it.

### Scenario A: First day
Maya opens the site, sees a sign-in screen, and creates an account. She lands on a board that already has *To Do*, *Doing* and *Done*. She adds a card, "Buy groceries", in *To Do*. She refreshes the page, and the card is still there and she's still signed in.

### Scenario B: Reorganizing
Maya drags "Buy groceries" into *Doing*, then puts it at the top of the column. She then adds a new column called *Waiting*. She deletes an old column, and the app asks "Are you sure? This also deletes the cards inside it." She confirms.

### Scenario C: Two screens at once
Maya has the board open on her laptop and in a second browser. She adds a card on the laptop, and it shows up in the other browser a moment later. She signs out in one window, and the other window also goes back to the sign-in screen.

### Scenario D: No signal on the train
The train goes into a tunnel. The badge changes to **Offline**. Maya adds two cards and moves one. All of it works right away, and the badge says "Syncing (3)" to show three changes are waiting. She accidentally refreshes the page in the tunnel. The board can't load without internet, but the screen says "You're offline. 3 changes are waiting to sync." Nothing is lost. When the train comes out of the tunnel, the changes go through, the badge turns to **Synced**, and the board shows everything.

### Scenario E: Creating things that depend on each other, offline
Offline, Maya creates a new column "Ideas" and immediately adds a card inside it. When the internet returns, both are created in the right order, with the card inside the column.

### Scenario F: Someone else
Sam creates a different account on the same site. Sam sees only Sam's own board. Maya's cards are never visible to Sam.

### Scenario G: A change that can't be applied
Maya edits a card on her phone while offline. Meanwhile, on her laptop, she deletes that same card. When the phone reconnects, its edit can't be applied because the card no longer exists. The app shouldn't crash or lose track of it silently. It should skip the change, or show that it couldn't be applied.

## 6. What the user sees

**Sign-in screen**
A simple, clean form with email, password, and a link to switch between "Sign in" and "Create account". Mistakes (wrong password, email already used) show a clear message.

**Board screen**
- Top bar: app name, the sync badge, and a user menu with "Sign out".
- Below it: columns side by side (scrolling sideways if there are many). Each column has a title, a small menu (rename, delete), its cards, and an "Add card" button. At the far right is an "Add column" button.
- While the board is loading, grey placeholder shapes appear instead of a blank page.
- Empty column: a friendly line like "No cards yet."

**The sync badge**
| Badge | Meaning |
|-------|---------|
| Synced (green) | Everything is saved; nothing waiting |
| Syncing (3) (yellow) | You're online, and 3 changes are still being sent |
| Offline (grey/red) | No connection; changes are saved on your device and will be sent later |
| Problem (orange) | A change couldn't be applied; click to see it |

**Look and feel**
We're using ready-made, good-looking components (shadcn/ui, plus pieces from Aceternity UI, Magic UI or uiverse.io) and changing them as little as possible. The goal is a clean, modern look with little design effort.

## 7. Acceptance checklist: how we know it works

The first version is done when all of these are true.

1. I can create an account and sign in. After a refresh I'm still signed in. If I sign out in one tab, my other tab also signs out without refreshing.
2. A second account cannot see or change my board.
3. I can create, rename and delete columns, and create, edit and delete cards. Everything is still there after a refresh.
4. I can drag cards within a column and between columns, and the order stays after a refresh and in another window.
5. With two windows open, a change in one shows up in the other within about a second, without refreshing.
6. With the internet switched off, I can add, edit and move cards. The screen changes immediately and the badge shows Offline, then "Syncing (N)" with a count.
7. With the internet still off, I refresh the page. I see how many changes are waiting, and nothing is lost.
8. When the internet comes back, the waiting changes are sent. The badge goes to Synced, and each change appears exactly once (no duplicates), including in my other window.
9. Offline, I can create a new column and add a card to it. After reconnecting, the card is correctly inside that column.
10. If a waiting change can't be applied (for example the card was deleted elsewhere), I can see that, rather than it disappearing silently.

## 8. Known limits (we'll be honest about these in the blog)

- **Refreshing while offline shows no board.** Concile doesn't keep a saved copy of your data on the device. It saves your *waiting changes*, but the board itself needs a connection to load. We'll show a friendly message instead of a blank page.
- **Offline is for hours or days, not weeks.** Browsers can clear stored data if it's unused for a long time (Safari after about a week, for example).
- **Concile is young** (version 1.0 isn't out yet), and it doesn't have search. It's a good learning project and a fair thing to point out in the post.
- **Two people changing the same thing** isn't "merged" automatically. The last change that arrives wins, unless we write extra checks.

## 9. How we'll judge success

- The checklist in section 7 passes.
- We have at least **8 notes** about the experience (what was smooth, what was confusing, what broke) to write the blog from.
- We have a short screen recording of the offline scenario (Scenario D), which is the best "wow" moment for the post.

## 10. The blog post (idea)

*Concile: an alternative to Convex*
1. Why Concile exists
2. What's the same as Convex and what's different (self-hosting, one program, offline support, choice of database)
3. What I built and how it went
4. What worked well, what didn't
5. Who should consider it

## 11. Glossary (plain words)

| Word | Meaning |
|------|---------|
| Backend | The behind-the-scenes part of an app: stores data, checks logins |
| Concile | The open-source backend we're learning |
| Live update | Changes show up on every open screen without refreshing |
| Sync | Making sure all your devices and the server agree on the same data |
| Offline queue | A to-do list inside your browser of changes waiting to be sent when the internet returns |
| Column / Card | A list on the board / one task inside a list |
| Component | A ready-made piece of interface (a button, a dialog, a card) we reuse instead of designing from scratch |

## 12. Where the technical details live

The data design, function list, offline mechanics and open technical questions are in **TECH-NOTES.md**. The step-by-step build plan, with prompts for an AI helper, is in **TASKS.md**.

Sources: [Concile](https://concile.dev/), [Concile on GitHub](https://github.com/concile-dev/concile)