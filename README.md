## Available Commands

### Categories

- `/get-categories` - Get categories (Administrator only)
- `/create-new-category` - Create new category (Administrator only)

### Language Exchange

- `/get-exchange-listings` - Get exchange partner listing
- `/register-my-exchange-listing` - Register exchange partner listing
- `/delete-my-exchange-listing` - Delete exchange partner listing
- `/help-exchange-partner` - Get help on how to use language exchange partner commands
- `/get-language-list` - Get language list

### Match-Match Game

- `/match-match` - Participate in a match-match
- `/create-a-new-match-match-topic` - Create a new match match topic (Administrator only)
- `/get-match-match-topics` - Get match-match topics (Administrator only)

### Pomodoro Study Groups

- `/create-pomodoro-group` - Create a new pomodoro study group
- `/join-pomodoro-group` - Join a pomodoro group
- `/leave-pomodoro-group` - Leave a pomodoro group
- `/check-pomodoro-status` - Check the pomodoro status

### Queue Management

- `/add-me-to-queue` - Add yourself to the queue
- `/remove-me-from-queue` - Remove yourself from the queue
- `/get-queue` - Get current queue
- `/shift-queue` - Shift the queue (Administrator only)
- `/reset-queue` - Reset the queue (Administrator only)

### Streak & Points

- `/get-my-streak-information` - Get your streak information
- `/current-streak-leaderboard` - Check the #study-check-in streak leaderboard
- `/all-time-streak-leaderboard` - Check the #study-check-in highest streak leaderboard
- `/word-games-point-leaderboard` - Show the word games point leaderboard

### Study Buddies

- `/register-my-study-buddy-listing` - Register study buddy listing
- `/get-study-buddy-listings` - Get study buddy listings
- `/delete-my-study-buddy-listing` - Delete study-buddy listing

### Utility

- `/etymology` - Get the etymology of a word
- `/ipa` - Get the transcription of a word
- `/generate-poll` - Generate a poll
- `/today` - Display today's events from the event calendar
- `/now` - Display events that are live right now
- `/extract-new-members` - Extract new members (Administrator only)

## Interactive Message Games

### Study Check-in System

- Use `!lc-streak` to maintain daily study streaks
- Community motivation through leaderboards

## Automated Features

### Server Management

- **New Member Tracking** - Automatically tracks new server members
- **Member Cleanup** - Removes data when members leave the server
- **Suggestion Box** - Auto-creates threads for suggestions with voting reactions

### Scheduled Tasks

- **Daily Match-Match Messages** - Automated daily word matching challenges
- **Monthly Point Reset** - Automatic monthly leaderboard announcements
- **Coffee Cup Game Validation** - Ensures game continuity

### Point System

Individual point breakdown by game type:

- **Categories**: 5 points base + bonus points
- **Counting**: 2 points per valid message
- **Shiritori**: 3 points per valid message
- **Letter Change**: 5 points per valid message
- **Emoji Blend**: (5 points × emoji count) + (message length ÷ 30) bonus points
- **Pass the Coffee Cup**: 50 points per successful turn
- **Match-Match**:
  - 2 matches: 50 points each
  - 3 matches: 25 points each
  - 4 matches: 10 points each
  - 5+ matches: 5 points each
  - No match: 3 points
