# GTA Equity Tracker

A premium, funnel-based web application that estimates a homeowner's current home value and equity using historical GTA (Greater Toronto Area) market data from 1996 to present.

## Features

- **Multi-step onboarding funnel** - Educates users about market estimates before collecting data
- **Market-based estimation** - Uses historical GTA market averages to calculate property value
- **Equity calculation** - Estimates remaining mortgage and calculates home equity
- **Beautiful dark theme** - Premium fintech/real-estate hybrid design
- **Conversion-focused** - Natural paths to CMA requests and consultations
- **Anonymous sessions** - No account required, privacy-focused

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Address Search**: Mapbox Geocoding API
- **Animations**: Framer Motion
- **Booking**: Calendly embed

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gta-equity-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your environment variables (see Environment Variables below)

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox Configuration (for address autocomplete)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token

# Calendly Configuration (for booking integration)
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/your-calendar-link
```

### Getting API Keys

1. **Supabase**: Create a project at [supabase.com](https://supabase.com)
2. **Mapbox**: Get an access token at [mapbox.com](https://www.mapbox.com/account/access-tokens)
3. **Calendly**: Set up scheduling at [calendly.com](https://calendly.com)

## Database Setup

Run the migration in your Supabase SQL editor:

```bash
# Located at: supabase/migrations/001_initial_schema.sql
```

This creates the following tables:
- `sessions` - Anonymous user sessions
- `estimates` - Calculated equity estimates
- `cma_requests` - CMA request submissions
- `booking_events` - Booking tracking

## Market Data

The application uses historical GTA market data stored in `data/gta-market-averages.json`.

### Data Format

```json
{
  "metadata": {
    "source": "TRREB / Official Board Data",
    "lastUpdated": "2024-12-01",
    "currentMarketPhase": "balanced"
  },
  "monthly": [
    { "year": 1996, "month": 1, "avgPrice": 198500, "salesVolume": 2450 }
  ],
  "historicalRates": {
    "1996": 7.5,
    "2024": 5.0
  }
}
```

Replace the sample data with actual market data from TRREB or your data source.

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page
│   ├── estimate/             # Funnel flow
│   ├── results/[sessionId]/  # Results page
│   └── api/                  # API routes
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── shared/               # Custom shared components
│   ├── funnel/               # Funnel step components
│   ├── results/              # Results page components
│   └── conversion/           # CMA form & Calendly
├── lib/
│   ├── estimation/           # Calculation logic
│   ├── supabase/             # Database client
│   └── constants.ts          # App constants
└── data/
    └── gta-market-averages.json
```

## Estimation Logic

The equity estimation follows this process:

1. **Calculate Purchase Index**: `purchase_price / market_avg_at_purchase`
2. **Apply to Current Market**: `current_market_avg × purchase_index`
3. **Apply Volatility Band**:
   - Hot market: ±4%
   - Balanced market: ±6%
   - Soft market: ±8-10%
4. **Calculate Remaining Mortgage**: Using 25-year amortization with historical rates
5. **Calculate Equity**: `estimated_value - remaining_mortgage`

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Design System

### Colors

- Background: `#0B0F14` (near-black)
- Surface: `#131920`
- Accent Blue: `#3B82F6`
- Accent Cyan: `#06B6D4`

### Typography

- Font: Inter
- Large headings with generous whitespace
- Gradient text for emphasis

### Components

- GlowButton: Primary CTAs with glow effect
- GradientText: Blue-to-cyan gradient text
- ProgressBar: Animated step indicator
- ValueDisplay: Animated number reveals

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

Build the production bundle:
```bash
npm run build
```

The output will be in the `.next` directory.

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.
