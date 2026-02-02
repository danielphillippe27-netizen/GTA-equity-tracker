import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

const rawData = [
  // Page 25: TRREB Areas
  { "report_month": "2025-12", "area_name": "All TRREB Areas", "property_category": "Detached", "hpi_index": 312.4, "benchmark_price": 1229200 },
  { "report_month": "2025-12", "area_name": "All TRREB Areas", "property_category": "Semi-Detached", "hpi_index": 330.4, "benchmark_price": 938700 },
  { "report_month": "2025-12", "area_name": "All TRREB Areas", "property_category": "Townhouse", "hpi_index": 327.9, "benchmark_price": 688900 },
  { "report_month": "2025-12", "area_name": "All TRREB Areas", "property_category": "Condo Apt", "hpi_index": 279.1, "benchmark_price": 553500 },

  { "report_month": "2025-12", "area_name": "Halton Region", "property_category": "Detached", "hpi_index": 324.7, "benchmark_price": 1290500 },
  { "report_month": "2025-12", "area_name": "Halton Region", "property_category": "Semi-Detached", "hpi_index": 347.8, "benchmark_price": 880200 },
  { "report_month": "2025-12", "area_name": "Halton Region", "property_category": "Townhouse", "hpi_index": 338.0, "benchmark_price": 654000 },
  { "report_month": "2025-12", "area_name": "Halton Region", "property_category": "Condo Apt", "hpi_index": 314.3, "benchmark_price": 533600 },

  { "report_month": "2025-12", "area_name": "Burlington", "property_category": "Detached", "hpi_index": 332.4, "benchmark_price": 1151900 },
  { "report_month": "2025-12", "area_name": "Burlington", "property_category": "Semi-Detached", "hpi_index": 351.1, "benchmark_price": 839200 },
  { "report_month": "2025-12", "area_name": "Burlington", "property_category": "Townhouse", "hpi_index": 342.9, "benchmark_price": 650500 },
  { "report_month": "2025-12", "area_name": "Burlington", "property_category": "Condo Apt", "hpi_index": 340.7, "benchmark_price": 511800 },

  { "report_month": "2025-12", "area_name": "Halton Hills", "property_category": "Detached", "hpi_index": 330.9, "benchmark_price": 1084000 },
  { "report_month": "2025-12", "area_name": "Halton Hills", "property_category": "Semi-Detached", "hpi_index": 341.3, "benchmark_price": 779900 },
  { "report_month": "2025-12", "area_name": "Halton Hills", "property_category": "Townhouse", "hpi_index": 355.4, "benchmark_price": 524600 },
  { "report_month": "2025-12", "area_name": "Halton Hills", "property_category": "Condo Apt", "hpi_index": 292.0, "benchmark_price": 531500 },

  { "report_month": "2025-12", "area_name": "Milton", "property_category": "Detached", "hpi_index": 313.4, "benchmark_price": 1195100 },
  { "report_month": "2025-12", "area_name": "Milton", "property_category": "Semi-Detached", "hpi_index": 346.4, "benchmark_price": 817500 },
  { "report_month": "2025-12", "area_name": "Milton", "property_category": "Townhouse", "hpi_index": 344.3, "benchmark_price": 597100 },
  { "report_month": "2025-12", "area_name": "Milton", "property_category": "Condo Apt", "hpi_index": 302.7, "benchmark_price": 523400 },

  { "report_month": "2025-12", "area_name": "Oakville", "property_category": "Detached", "hpi_index": 341.9, "benchmark_price": 1552000 },
  { "report_month": "2025-12", "area_name": "Oakville", "property_category": "Semi-Detached", "hpi_index": 358.0, "benchmark_price": 985600 },
  { "report_month": "2025-12", "area_name": "Oakville", "property_category": "Townhouse", "hpi_index": 324.7, "benchmark_price": 698800 },
  { "report_month": "2025-12", "area_name": "Oakville", "property_category": "Condo Apt", "hpi_index": 315.2, "benchmark_price": 569300 },

  { "report_month": "2025-12", "area_name": "Peel Region", "property_category": "Detached", "hpi_index": 314.3, "benchmark_price": 1153700 },
  { "report_month": "2025-12", "area_name": "Peel Region", "property_category": "Semi-Detached", "hpi_index": 315.2, "benchmark_price": 826800 },
  { "report_month": "2025-12", "area_name": "Peel Region", "property_category": "Townhouse", "hpi_index": 324.3, "benchmark_price": 690500 },
  { "report_month": "2025-12", "area_name": "Peel Region", "property_category": "Condo Apt", "hpi_index": 292.3, "benchmark_price": 502200 },

  { "report_month": "2025-12", "area_name": "Brampton", "property_category": "Detached", "hpi_index": 310.1, "benchmark_price": 1014000 },
  { "report_month": "2025-12", "area_name": "Brampton", "property_category": "Semi-Detached", "hpi_index": 321.4, "benchmark_price": 779700 },
  { "report_month": "2025-12", "area_name": "Brampton", "property_category": "Townhouse", "hpi_index": 345.4, "benchmark_price": 617600 },
  { "report_month": "2025-12", "area_name": "Brampton", "property_category": "Condo Apt", "hpi_index": 293.6, "benchmark_price": 431000 },

  { "report_month": "2025-12", "area_name": "Caledon", "property_category": "Detached", "hpi_index": 325.8, "benchmark_price": 1262300 },
  { "report_month": "2025-12", "area_name": "Caledon", "property_category": "Semi-Detached", "hpi_index": 339.0, "benchmark_price": 832600 },
  { "report_month": "2025-12", "area_name": "Caledon", "property_category": "Townhouse", "hpi_index": 301.9, "benchmark_price": 801800 },
  { "report_month": "2025-12", "area_name": "Caledon", "property_category": "Condo Apt", "hpi_index": 260.4, "benchmark_price": 621000 },

  { "report_month": "2025-12", "area_name": "Mississauga", "property_category": "Detached", "hpi_index": 317.1, "benchmark_price": 1284500 },
  { "report_month": "2025-12", "area_name": "Mississauga", "property_category": "Semi-Detached", "hpi_index": 317.5, "benchmark_price": 896200 },
  { "report_month": "2025-12", "area_name": "Mississauga", "property_category": "Townhouse", "hpi_index": 321.1, "benchmark_price": 713500 },
  { "report_month": "2025-12", "area_name": "Mississauga", "property_category": "Condo Apt", "hpi_index": 292.1, "benchmark_price": 513800 },

  { "report_month": "2025-12", "area_name": "City of Toronto", "property_category": "Detached", "hpi_index": 308.5, "benchmark_price": 1465600 },
  { "report_month": "2025-12", "area_name": "City of Toronto", "property_category": "Semi-Detached", "hpi_index": 336.4, "benchmark_price": 1157200 },
  { "report_month": "2025-12", "area_name": "City of Toronto", "property_category": "Townhouse", "hpi_index": 327.0, "benchmark_price": 738400 },
  { "report_month": "2025-12", "area_name": "City of Toronto", "property_category": "Condo Apt", "hpi_index": 277.9, "benchmark_price": 573600 },

  { "report_month": "2025-12", "area_name": "York Region", "property_category": "Detached", "hpi_index": 327.9, "benchmark_price": 1393800 },
  { "report_month": "2025-12", "area_name": "York Region", "property_category": "Semi-Detached", "hpi_index": 339.1, "benchmark_price": 1010900 },
  { "report_month": "2025-12", "area_name": "York Region", "property_category": "Townhouse", "hpi_index": 298.3, "benchmark_price": 768200 },
  { "report_month": "2025-12", "area_name": "York Region", "property_category": "Condo Apt", "hpi_index": 259.3, "benchmark_price": 540700 },

  { "report_month": "2025-12", "area_name": "Aurora", "property_category": "Detached", "hpi_index": 341.7, "benchmark_price": 1348400 },
  { "report_month": "2025-12", "area_name": "Aurora", "property_category": "Semi-Detached", "hpi_index": 363.7, "benchmark_price": 938800 },
  { "report_month": "2025-12", "area_name": "Aurora", "property_category": "Townhouse", "hpi_index": 244.9, "benchmark_price": 788600 },
  { "report_month": "2025-12", "area_name": "Aurora", "property_category": "Condo Apt", "hpi_index": 287.7, "benchmark_price": 542300 },

  { "report_month": "2025-12", "area_name": "East Gwillimbury", "property_category": "Detached", "hpi_index": 328.1, "benchmark_price": 1199700 },
  { "report_month": "2025-12", "area_name": "East Gwillimbury", "property_category": "Semi-Detached", "hpi_index": 356.3, "benchmark_price": 835100 },

  { "report_month": "2025-12", "area_name": "Georgina", "property_category": "Detached", "hpi_index": 365.8, "benchmark_price": 751400 },
  { "report_month": "2025-12", "area_name": "Georgina", "property_category": "Semi-Detached", "hpi_index": 387.6, "benchmark_price": 689900 },

  { "report_month": "2025-12", "area_name": "King", "property_category": "Detached", "hpi_index": 347.3, "benchmark_price": 1833100 },
  { "report_month": "2025-12", "area_name": "King", "property_category": "Semi-Detached", "hpi_index": 281.7, "benchmark_price": 800800 },
  { "report_month": "2025-12", "area_name": "King", "property_category": "Condo Apt", "hpi_index": 255.6, "benchmark_price": 617700 },

  { "report_month": "2025-12", "area_name": "Markham", "property_category": "Detached", "hpi_index": 350.2, "benchmark_price": 1524000 },
  { "report_month": "2025-12", "area_name": "Markham", "property_category": "Semi-Detached", "hpi_index": 361.7, "benchmark_price": 1081000 },
  { "report_month": "2025-12", "area_name": "Markham", "property_category": "Townhouse", "hpi_index": 292.9, "benchmark_price": 771200 },
  { "report_month": "2025-12", "area_name": "Markham", "property_category": "Condo Apt", "hpi_index": 253.9, "benchmark_price": 549000 },

  { "report_month": "2025-12", "area_name": "Newmarket", "property_category": "Detached", "hpi_index": 315.5, "benchmark_price": 1141600 },
  { "report_month": "2025-12", "area_name": "Newmarket", "property_category": "Semi-Detached", "hpi_index": 316.2, "benchmark_price": 828100 },
  { "report_month": "2025-12", "area_name": "Newmarket", "property_category": "Townhouse", "hpi_index": 350.8, "benchmark_price": 724300 },
  { "report_month": "2025-12", "area_name": "Newmarket", "property_category": "Condo Apt", "hpi_index": 289.6, "benchmark_price": 491100 },

  { "report_month": "2025-12", "area_name": "Richmond Hill", "property_category": "Detached", "hpi_index": 329.3, "benchmark_price": 1615900 },
  { "report_month": "2025-12", "area_name": "Richmond Hill", "property_category": "Semi-Detached", "hpi_index": 324.2, "benchmark_price": 1051500 },
  { "report_month": "2025-12", "area_name": "Richmond Hill", "property_category": "Townhouse", "hpi_index": 310.8, "benchmark_price": 777700 },
  { "report_month": "2025-12", "area_name": "Richmond Hill", "property_category": "Condo Apt", "hpi_index": 273.2, "benchmark_price": 533600 },

  { "report_month": "2025-12", "area_name": "Vaughan", "property_category": "Detached", "hpi_index": 324.0, "benchmark_price": 1534600 },
  { "report_month": "2025-12", "area_name": "Vaughan", "property_category": "Semi-Detached", "hpi_index": 333.8, "benchmark_price": 1057000 },
  { "report_month": "2025-12", "area_name": "Vaughan", "property_category": "Townhouse", "hpi_index": 297.7, "benchmark_price": 793900 },
  { "report_month": "2025-12", "area_name": "Vaughan", "property_category": "Condo Apt", "hpi_index": 238.4, "benchmark_price": 537500 },

  { "report_month": "2025-12", "area_name": "Stouffville", "property_category": "Detached", "hpi_index": 316.1, "benchmark_price": 1304900 },
  { "report_month": "2025-12", "area_name": "Stouffville", "property_category": "Semi-Detached", "hpi_index": 350.3, "benchmark_price": 895000 },
  { "report_month": "2025-12", "area_name": "Stouffville", "property_category": "Townhouse", "hpi_index": 355.1, "benchmark_price": 660800 },
  { "report_month": "2025-12", "area_name": "Stouffville", "property_category": "Condo Apt", "hpi_index": 287.5, "benchmark_price": 583900 },

  { "report_month": "2025-12", "area_name": "Durham Region", "property_category": "Detached", "hpi_index": 337.0, "benchmark_price": 905900 },
  { "report_month": "2025-12", "area_name": "Durham Region", "property_category": "Semi-Detached", "hpi_index": 363.7, "benchmark_price": 713300 },
  { "report_month": "2025-12", "area_name": "Durham Region", "property_category": "Townhouse", "hpi_index": 386.2, "benchmark_price": 588600 },
  { "report_month": "2025-12", "area_name": "Durham Region", "property_category": "Condo Apt", "hpi_index": 286.8, "benchmark_price": 476900 },

  { "report_month": "2025-12", "area_name": "Ajax", "property_category": "Detached", "hpi_index": 331.3, "benchmark_price": 952800 },
  { "report_month": "2025-12", "area_name": "Ajax", "property_category": "Semi-Detached", "hpi_index": 332.9, "benchmark_price": 772400 },
  { "report_month": "2025-12", "area_name": "Ajax", "property_category": "Townhouse", "hpi_index": 369.6, "benchmark_price": 635000 },
  { "report_month": "2025-12", "area_name": "Ajax", "property_category": "Condo Apt", "hpi_index": 284.0, "benchmark_price": 460700 },

  { "report_month": "2025-12", "area_name": "Brock", "property_category": "Detached", "hpi_index": 346.5, "benchmark_price": 671900 },

  { "report_month": "2025-12", "area_name": "Clarington", "property_category": "Detached", "hpi_index": 338.7, "benchmark_price": 848500 },
  { "report_month": "2025-12", "area_name": "Clarington", "property_category": "Semi-Detached", "hpi_index": 365.8, "benchmark_price": 657000 },
  { "report_month": "2025-12", "area_name": "Clarington", "property_category": "Townhouse", "hpi_index": 358.6, "benchmark_price": 574900 },
  { "report_month": "2025-12", "area_name": "Clarington", "property_category": "Condo Apt", "hpi_index": 324.4, "benchmark_price": 467800 },

  { "report_month": "2025-12", "area_name": "Oshawa", "property_category": "Detached", "hpi_index": 369.9, "benchmark_price": 786400 },
  { "report_month": "2025-12", "area_name": "Oshawa", "property_category": "Semi-Detached", "hpi_index": 402.3, "benchmark_price": 632800 },
  { "report_month": "2025-12", "area_name": "Oshawa", "property_category": "Townhouse", "hpi_index": 419.4, "benchmark_price": 529300 },
  { "report_month": "2025-12", "area_name": "Oshawa", "property_category": "Condo Apt", "hpi_index": 383.3, "benchmark_price": 432800 },

  { "report_month": "2025-12", "area_name": "Pickering", "property_category": "Detached", "hpi_index": 324.6, "benchmark_price": 1067900 },
  { "report_month": "2025-12", "area_name": "Pickering", "property_category": "Semi-Detached", "hpi_index": 327.3, "benchmark_price": 773000 },
  { "report_month": "2025-12", "area_name": "Pickering", "property_category": "Townhouse", "hpi_index": 355.5, "benchmark_price": 601800 },
  { "report_month": "2025-12", "area_name": "Pickering", "property_category": "Condo Apt", "hpi_index": 246.1, "benchmark_price": 485600 },

  { "report_month": "2025-12", "area_name": "Scugog", "property_category": "Detached", "hpi_index": 327.0, "benchmark_price": 881000 },
  { "report_month": "2025-12", "area_name": "Scugog", "property_category": "Semi-Detached", "hpi_index": 351.4, "benchmark_price": 700300 },

  { "report_month": "2025-12", "area_name": "Uxbridge", "property_category": "Detached", "hpi_index": 324.0, "benchmark_price": 1145800 },
  { "report_month": "2025-12", "area_name": "Uxbridge", "property_category": "Semi-Detached", "hpi_index": 350.1, "benchmark_price": 864300 },
  { "report_month": "2025-12", "area_name": "Uxbridge", "property_category": "Townhouse", "hpi_index": 394.4, "benchmark_price": 617700 },
  { "report_month": "2025-12", "area_name": "Uxbridge", "property_category": "Condo Apt", "hpi_index": 251.3, "benchmark_price": 579000 },

  { "report_month": "2025-12", "area_name": "Whitby", "property_category": "Detached", "hpi_index": 343.6, "benchmark_price": 1002700 },
  { "report_month": "2025-12", "area_name": "Whitby", "property_category": "Semi-Detached", "hpi_index": 358.4, "benchmark_price": 750800 },
  { "report_month": "2025-12", "area_name": "Whitby", "property_category": "Townhouse", "hpi_index": 435.0, "benchmark_price": 681600 },
  { "report_month": "2025-12", "area_name": "Whitby", "property_category": "Condo Apt", "hpi_index": 288.1, "benchmark_price": 511100 },

  { "report_month": "2025-12", "area_name": "Dufferin County", "property_category": "Detached", "hpi_index": 348.6, "benchmark_price": 839700 },
  { "report_month": "2025-12", "area_name": "Dufferin County", "property_category": "Semi-Detached", "hpi_index": 366.0, "benchmark_price": 651800 },
  { "report_month": "2025-12", "area_name": "Dufferin County", "property_category": "Townhouse", "hpi_index": 365.1, "benchmark_price": 500200 },
  { "report_month": "2025-12", "area_name": "Dufferin County", "property_category": "Condo Apt", "hpi_index": 287.4, "benchmark_price": 391100 },

  { "report_month": "2025-12", "area_name": "Orangeville", "property_category": "Detached", "hpi_index": 348.6, "benchmark_price": 839700 },
  { "report_month": "2025-12", "area_name": "Orangeville", "property_category": "Semi-Detached", "hpi_index": 366.0, "benchmark_price": 651800 },
  { "report_month": "2025-12", "area_name": "Orangeville", "property_category": "Townhouse", "hpi_index": 365.1, "benchmark_price": 500200 },
  { "report_month": "2025-12", "area_name": "Orangeville", "property_category": "Condo Apt", "hpi_index": 287.4, "benchmark_price": 391100 },

  { "report_month": "2025-12", "area_name": "Simcoe County", "property_category": "Detached", "hpi_index": 372.1, "benchmark_price": 828700 },
  { "report_month": "2025-12", "area_name": "Simcoe County", "property_category": "Semi-Detached", "hpi_index": 367.0, "benchmark_price": 671900 },
  { "report_month": "2025-12", "area_name": "Simcoe County", "property_category": "Townhouse", "hpi_index": 335.8, "benchmark_price": 620300 },
  { "report_month": "2025-12", "area_name": "Simcoe County", "property_category": "Condo Apt", "hpi_index": 303.6, "benchmark_price": 512500 },

  { "report_month": "2025-12", "area_name": "Adjala-Tosorontio", "property_category": "Detached", "hpi_index": 360.4, "benchmark_price": 1004900 },

  { "report_month": "2025-12", "area_name": "Bradford", "property_category": "Detached", "hpi_index": 353.4, "benchmark_price": 1054300 },
  { "report_month": "2025-12", "area_name": "Bradford", "property_category": "Semi-Detached", "hpi_index": 369.9, "benchmark_price": 802600 },
  { "report_month": "2025-12", "area_name": "Bradford", "property_category": "Townhouse", "hpi_index": 362.1, "benchmark_price": 581100 },
  { "report_month": "2025-12", "area_name": "Bradford", "property_category": "Condo Apt", "hpi_index": 278.2, "benchmark_price": 509300 },

  { "report_month": "2025-12", "area_name": "Essa", "property_category": "Detached", "hpi_index": 367.8, "benchmark_price": 742200 },
  { "report_month": "2025-12", "area_name": "Essa", "property_category": "Semi-Detached", "hpi_index": 377.1, "benchmark_price": 578800 },
  { "report_month": "2025-12", "area_name": "Essa", "property_category": "Townhouse", "hpi_index": 401.8, "benchmark_price": 556500 },

  { "report_month": "2025-12", "area_name": "Innisfil", "property_category": "Detached", "hpi_index": 367.6, "benchmark_price": 702100 },
  { "report_month": "2025-12", "area_name": "Innisfil", "property_category": "Semi-Detached", "hpi_index": 381.4, "benchmark_price": 557200 },
  { "report_month": "2025-12", "area_name": "Innisfil", "property_category": "Townhouse", "hpi_index": 750.5, "benchmark_price": 743000 },
  { "report_month": "2025-12", "area_name": "Innisfil", "property_category": "Condo Apt", "hpi_index": 279.4, "benchmark_price": 535100 },

  { "report_month": "2025-12", "area_name": "New Tecumseth", "property_category": "Detached", "hpi_index": 325.5, "benchmark_price": 831700 },
  { "report_month": "2025-12", "area_name": "New Tecumseth", "property_category": "Semi-Detached", "hpi_index": 352.8, "benchmark_price": 648100 },
  { "report_month": "2025-12", "area_name": "New Tecumseth", "property_category": "Townhouse", "hpi_index": 314.9, "benchmark_price": 626300 },
  { "report_month": "2025-12", "area_name": "New Tecumseth", "property_category": "Condo Apt", "hpi_index": 294.3, "benchmark_price": 480300 },

  // Page 26: City of Toronto Districts
  { "report_month": "2025-12", "area_name": "Toronto W01", "property_category": "Detached", "hpi_index": 370.1, "benchmark_price": 2154300 },
  { "report_month": "2025-12", "area_name": "Toronto W01", "property_category": "Semi-Detached", "hpi_index": 370.6, "benchmark_price": 1397500 },
  { "report_month": "2025-12", "area_name": "Toronto W01", "property_category": "Townhouse", "hpi_index": 238.9, "benchmark_price": 683100 },
  { "report_month": "2025-12", "area_name": "Toronto W01", "property_category": "Condo Apt", "hpi_index": 273.7, "benchmark_price": 553500 },

  { "report_month": "2025-12", "area_name": "Toronto W02", "property_category": "Detached", "hpi_index": 380.7, "benchmark_price": 1660000 },
  { "report_month": "2025-12", "area_name": "Toronto W02", "property_category": "Semi-Detached", "hpi_index": 400.4, "benchmark_price": 1224300 },
  { "report_month": "2025-12", "area_name": "Toronto W02", "property_category": "Townhouse", "hpi_index": 305.6, "benchmark_price": 782300 },
  { "report_month": "2025-12", "area_name": "Toronto W02", "property_category": "Condo Apt", "hpi_index": 284.9, "benchmark_price": 616800 },

  { "report_month": "2025-12", "area_name": "Toronto W03", "property_category": "Detached", "hpi_index": 344.2, "benchmark_price": 925600 },
  { "report_month": "2025-12", "area_name": "Toronto W03", "property_category": "Semi-Detached", "hpi_index": 355.6, "benchmark_price": 892300 },
  { "report_month": "2025-12", "area_name": "Toronto W03", "property_category": "Condo Apt", "hpi_index": 324.8, "benchmark_price": 523200 },

  { "report_month": "2025-12", "area_name": "Toronto W04", "property_category": "Detached", "hpi_index": 332.4, "benchmark_price": 1037400 },
  { "report_month": "2025-12", "area_name": "Toronto W04", "property_category": "Semi-Detached", "hpi_index": 301.0, "benchmark_price": 816200 },
  { "report_month": "2025-12", "area_name": "Toronto W04", "property_category": "Townhouse", "hpi_index": 302.7, "benchmark_price": 635700 },
  { "report_month": "2025-12", "area_name": "Toronto W04", "property_category": "Condo Apt", "hpi_index": 335.5, "benchmark_price": 525100 },

  { "report_month": "2025-12", "area_name": "Toronto W05", "property_category": "Detached", "hpi_index": 306.1, "benchmark_price": 1077300 },
  { "report_month": "2025-12", "area_name": "Toronto W05", "property_category": "Semi-Detached", "hpi_index": 290.2, "benchmark_price": 876600 },
  { "report_month": "2025-12", "area_name": "Toronto W05", "property_category": "Townhouse", "hpi_index": 337.7, "benchmark_price": 626400 },
  { "report_month": "2025-12", "area_name": "Toronto W05", "property_category": "Condo Apt", "hpi_index": 413.0, "benchmark_price": 475800 },

  { "report_month": "2025-12", "area_name": "Toronto W06", "property_category": "Detached", "hpi_index": 362.4, "benchmark_price": 1215800 },
  { "report_month": "2025-12", "area_name": "Toronto W06", "property_category": "Semi-Detached", "hpi_index": 348.2, "benchmark_price": 1165200 },
  { "report_month": "2025-12", "area_name": "Toronto W06", "property_category": "Townhouse", "hpi_index": 341.3, "benchmark_price": 819100 },
  { "report_month": "2025-12", "area_name": "Toronto W06", "property_category": "Condo Apt", "hpi_index": 231.7, "benchmark_price": 576400 },

  { "report_month": "2025-12", "area_name": "Toronto W07", "property_category": "Detached", "hpi_index": 310.2, "benchmark_price": 1541900 },
  { "report_month": "2025-12", "area_name": "Toronto W07", "property_category": "Semi-Detached", "hpi_index": 308.5, "benchmark_price": 1259600 },
  { "report_month": "2025-12", "area_name": "Toronto W07", "property_category": "Condo Apt", "hpi_index": 113.1, "benchmark_price": 554200 },

  { "report_month": "2025-12", "area_name": "Toronto W08", "property_category": "Detached", "hpi_index": 281.2, "benchmark_price": 1652400 },
  { "report_month": "2025-12", "area_name": "Toronto W08", "property_category": "Semi-Detached", "hpi_index": 327.4, "benchmark_price": 1267800 },
  { "report_month": "2025-12", "area_name": "Toronto W08", "property_category": "Townhouse", "hpi_index": 275.3, "benchmark_price": 722100 },
  { "report_month": "2025-12", "area_name": "Toronto W08", "property_category": "Condo Apt", "hpi_index": 309.6, "benchmark_price": 544300 },

  { "report_month": "2025-12", "area_name": "Toronto W09", "property_category": "Detached", "hpi_index": 288.2, "benchmark_price": 1188200 },
  { "report_month": "2025-12", "area_name": "Toronto W09", "property_category": "Semi-Detached", "hpi_index": 337.5, "benchmark_price": 933100 },
  { "report_month": "2025-12", "area_name": "Toronto W09", "property_category": "Townhouse", "hpi_index": 257.2, "benchmark_price": 714200 },
  { "report_month": "2025-12", "area_name": "Toronto W09", "property_category": "Condo Apt", "hpi_index": 359.9, "benchmark_price": 415300 },

  { "report_month": "2025-12", "area_name": "Toronto W10", "property_category": "Detached", "hpi_index": 299.1, "benchmark_price": 891500 },
  { "report_month": "2025-12", "area_name": "Toronto W10", "property_category": "Semi-Detached", "hpi_index": 298.6, "benchmark_price": 795100 },
  { "report_month": "2025-12", "area_name": "Toronto W10", "property_category": "Townhouse", "hpi_index": 345.5, "benchmark_price": 593600 },
  { "report_month": "2025-12", "area_name": "Toronto W10", "property_category": "Condo Apt", "hpi_index": 346.1, "benchmark_price": 454100 },

  { "report_month": "2025-12", "area_name": "Toronto C01", "property_category": "Detached", "hpi_index": 362.0, "benchmark_price": 1669300 },
  { "report_month": "2025-12", "area_name": "Toronto C01", "property_category": "Semi-Detached", "hpi_index": 342.1, "benchmark_price": 1303300 },
  { "report_month": "2025-12", "area_name": "Toronto C01", "property_category": "Townhouse", "hpi_index": 316.6, "benchmark_price": 717200 },
  { "report_month": "2025-12", "area_name": "Toronto C01", "property_category": "Condo Apt", "hpi_index": 261.2, "benchmark_price": 590600 },

  { "report_month": "2025-12", "area_name": "Toronto C02", "property_category": "Detached", "hpi_index": 269.1, "benchmark_price": 2708800 },
  { "report_month": "2025-12", "area_name": "Toronto C02", "property_category": "Semi-Detached", "hpi_index": 308.9, "benchmark_price": 1984200 },
  { "report_month": "2025-12", "area_name": "Toronto C02", "property_category": "Townhouse", "hpi_index": 347.6, "benchmark_price": 1531700 },
  { "report_month": "2025-12", "area_name": "Toronto C02", "property_category": "Condo Apt", "hpi_index": 269.5, "benchmark_price": 896100 },

  { "report_month": "2025-12", "area_name": "Toronto C03", "property_category": "Detached", "hpi_index": 300.1, "benchmark_price": 1875100 },
  { "report_month": "2025-12", "area_name": "Toronto C03", "property_category": "Semi-Detached", "hpi_index": 360.8, "benchmark_price": 1154800 },
  { "report_month": "2025-12", "area_name": "Toronto C03", "property_category": "Condo Apt", "hpi_index": 255.3, "benchmark_price": 746400 },

  { "report_month": "2025-12", "area_name": "Toronto C04", "property_category": "Detached", "hpi_index": 290.3, "benchmark_price": 2409500 },
  { "report_month": "2025-12", "area_name": "Toronto C04", "property_category": "Semi-Detached", "hpi_index": 292.1, "benchmark_price": 1433300 },
  { "report_month": "2025-12", "area_name": "Toronto C04", "property_category": "Condo Apt", "hpi_index": 285.1, "benchmark_price": 710700 },

  { "report_month": "2025-12", "area_name": "Toronto C06", "property_category": "Detached", "hpi_index": 296.5, "benchmark_price": 1424000 },
  { "report_month": "2025-12", "area_name": "Toronto C06", "property_category": "Semi-Detached", "hpi_index": 284.9, "benchmark_price": 1119800 },
  { "report_month": "2025-12", "area_name": "Toronto C06", "property_category": "Condo Apt", "hpi_index": 297.8, "benchmark_price": 530600 },

  { "report_month": "2025-12", "area_name": "Toronto C07", "property_category": "Detached", "hpi_index": 308.2, "benchmark_price": 1671100 },
  { "report_month": "2025-12", "area_name": "Toronto C07", "property_category": "Semi-Detached", "hpi_index": 284.4, "benchmark_price": 1019900 },
  { "report_month": "2025-12", "area_name": "Toronto C07", "property_category": "Townhouse", "hpi_index": 291.6, "benchmark_price": 732000 },
  { "report_month": "2025-12", "area_name": "Toronto C07", "property_category": "Condo Apt", "hpi_index": 278.3, "benchmark_price": 659800 },

  { "report_month": "2025-12", "area_name": "Toronto C08", "property_category": "Detached", "hpi_index": 351.6, "benchmark_price": 2036400 },
  { "report_month": "2025-12", "area_name": "Toronto C08", "property_category": "Semi-Detached", "hpi_index": 313.6, "benchmark_price": 1323800 },
  { "report_month": "2025-12", "area_name": "Toronto C08", "property_category": "Townhouse", "hpi_index": 360.9, "benchmark_price": 884200 },
  { "report_month": "2025-12", "area_name": "Toronto C08", "property_category": "Condo Apt", "hpi_index": 260.5, "benchmark_price": 518100 },

  { "report_month": "2025-12", "area_name": "Toronto C09", "property_category": "Detached", "hpi_index": 233.0, "benchmark_price": 3482800 },
  { "report_month": "2025-12", "area_name": "Toronto C09", "property_category": "Semi-Detached", "hpi_index": 254.4, "benchmark_price": 2304800 },
  { "report_month": "2025-12", "area_name": "Toronto C09", "property_category": "Townhouse", "hpi_index": 260.0, "benchmark_price": 1562700 },
  { "report_month": "2025-12", "area_name": "Toronto C09", "property_category": "Condo Apt", "hpi_index": 256.3, "benchmark_price": 876700 },

  { "report_month": "2025-12", "area_name": "Toronto C10", "property_category": "Detached", "hpi_index": 290.6, "benchmark_price": 1933200 },
  { "report_month": "2025-12", "area_name": "Toronto C10", "property_category": "Semi-Detached", "hpi_index": 302.6, "benchmark_price": 1409900 },
  { "report_month": "2025-12", "area_name": "Toronto C10", "property_category": "Townhouse", "hpi_index": 276.5, "benchmark_price": 876700 },
  { "report_month": "2025-12", "area_name": "Toronto C10", "property_category": "Condo Apt", "hpi_index": 250.2, "benchmark_price": 613000 },

  { "report_month": "2025-12", "area_name": "Toronto C11", "property_category": "Detached", "hpi_index": 256.0, "benchmark_price": 2198600 },
  { "report_month": "2025-12", "area_name": "Toronto C11", "property_category": "Semi-Detached", "hpi_index": 277.6, "benchmark_price": 1346900 },
  { "report_month": "2025-12", "area_name": "Toronto C11", "property_category": "Townhouse", "hpi_index": 341.5, "benchmark_price": 549200 },
  { "report_month": "2025-12", "area_name": "Toronto C11", "property_category": "Condo Apt", "hpi_index": 306.0, "benchmark_price": 466100 },

  { "report_month": "2025-12", "area_name": "Toronto C12", "property_category": "Detached", "hpi_index": 272.4, "benchmark_price": 3185200 },
  { "report_month": "2025-12", "area_name": "Toronto C12", "property_category": "Semi-Detached", "hpi_index": 274.6, "benchmark_price": 1373900 },
  { "report_month": "2025-12", "area_name": "Toronto C12", "property_category": "Townhouse", "hpi_index": 258.0, "benchmark_price": 1111300 },
  { "report_month": "2025-12", "area_name": "Toronto C12", "property_category": "Condo Apt", "hpi_index": 312.6, "benchmark_price": 1106100 },

  { "report_month": "2025-12", "area_name": "Toronto C13", "property_category": "Detached", "hpi_index": 293.9, "benchmark_price": 1668800 },
  { "report_month": "2025-12", "area_name": "Toronto C13", "property_category": "Semi-Detached", "hpi_index": 294.3, "benchmark_price": 967100 },
  { "report_month": "2025-12", "area_name": "Toronto C13", "property_category": "Townhouse", "hpi_index": 309.4, "benchmark_price": 756500 },
  { "report_month": "2025-12", "area_name": "Toronto C13", "property_category": "Condo Apt", "hpi_index": 219.2, "benchmark_price": 580900 },

  { "report_month": "2025-12", "area_name": "Toronto C14", "property_category": "Detached", "hpi_index": 303.6, "benchmark_price": 1984400 },
  { "report_month": "2025-12", "area_name": "Toronto C14", "property_category": "Semi-Detached", "hpi_index": 278.1, "benchmark_price": 1311100 },
  { "report_month": "2025-12", "area_name": "Toronto C14", "property_category": "Townhouse", "hpi_index": 324.7, "benchmark_price": 755800 },
  { "report_month": "2025-12", "area_name": "Toronto C14", "property_category": "Condo Apt", "hpi_index": 270.3, "benchmark_price": 611900 },

  { "report_month": "2025-12", "area_name": "Toronto C15", "property_category": "Detached", "hpi_index": 291.6, "benchmark_price": 1519600 },
  { "report_month": "2025-12", "area_name": "Toronto C15", "property_category": "Semi-Detached", "hpi_index": 272.6, "benchmark_price": 937600 },
  { "report_month": "2025-12", "area_name": "Toronto C15", "property_category": "Townhouse", "hpi_index": 328.4, "benchmark_price": 745100 },
  { "report_month": "2025-12", "area_name": "Toronto C15", "property_category": "Condo Apt", "hpi_index": 272.3, "benchmark_price": 516900 },

  { "report_month": "2025-12", "area_name": "Toronto E01", "property_category": "Detached", "hpi_index": 389.8, "benchmark_price": 1438600 },
  { "report_month": "2025-12", "area_name": "Toronto E01", "property_category": "Semi-Detached", "hpi_index": 384.5, "benchmark_price": 1240400 },
  { "report_month": "2025-12", "area_name": "Toronto E01", "property_category": "Townhouse", "hpi_index": 447.8, "benchmark_price": 828900 },
  { "report_month": "2025-12", "area_name": "Toronto E01", "property_category": "Condo Apt", "hpi_index": 273.7, "benchmark_price": 609700 },

  { "report_month": "2025-12", "area_name": "Toronto E02", "property_category": "Detached", "hpi_index": 330.0, "benchmark_price": 1646100 },
  { "report_month": "2025-12", "area_name": "Toronto E02", "property_category": "Semi-Detached", "hpi_index": 337.4, "benchmark_price": 1209400 },
  { "report_month": "2025-12", "area_name": "Toronto E02", "property_category": "Townhouse", "hpi_index": 324.1, "benchmark_price": 964000 },
  { "report_month": "2025-12", "area_name": "Toronto E02", "property_category": "Condo Apt", "hpi_index": 254.5, "benchmark_price": 691000 },

  { "report_month": "2025-12", "area_name": "Toronto E03", "property_category": "Detached", "hpi_index": 339.9, "benchmark_price": 1217400 },
  { "report_month": "2025-12", "area_name": "Toronto E03", "property_category": "Semi-Detached", "hpi_index": 307.4, "benchmark_price": 1107100 },
  { "report_month": "2025-12", "area_name": "Toronto E03", "property_category": "Condo Apt", "hpi_index": 314.6, "benchmark_price": 475600 },

  { "report_month": "2025-12", "area_name": "Toronto E04", "property_category": "Detached", "hpi_index": 322.9, "benchmark_price": 922500 },
  { "report_month": "2025-12", "area_name": "Toronto E04", "property_category": "Semi-Detached", "hpi_index": 319.2, "benchmark_price": 777000 },
  { "report_month": "2025-12", "area_name": "Toronto E04", "property_category": "Townhouse", "hpi_index": 298.9, "benchmark_price": 663800 },
  { "report_month": "2025-12", "area_name": "Toronto E04", "property_category": "Condo Apt", "hpi_index": 369.2, "benchmark_price": 441600 },

  { "report_month": "2025-12", "area_name": "Toronto E05", "property_category": "Detached", "hpi_index": 313.7, "benchmark_price": 1128000 },
  { "report_month": "2025-12", "area_name": "Toronto E05", "property_category": "Semi-Detached", "hpi_index": 314.5, "benchmark_price": 880600 },
  { "report_month": "2025-12", "area_name": "Toronto E05", "property_category": "Townhouse", "hpi_index": 303.0, "benchmark_price": 668400 },
  { "report_month": "2025-12", "area_name": "Toronto E05", "property_category": "Condo Apt", "hpi_index": 295.5, "benchmark_price": 505900 },

  { "report_month": "2025-12", "area_name": "Toronto E06", "property_category": "Detached", "hpi_index": 324.1, "benchmark_price": 1071600 },
  { "report_month": "2025-12", "area_name": "Toronto E06", "property_category": "Semi-Detached", "hpi_index": 324.3, "benchmark_price": 886700 },
  { "report_month": "2025-12", "area_name": "Toronto E06", "property_category": "Townhouse", "hpi_index": 319.1, "benchmark_price": 661200 },
  { "report_month": "2025-12", "area_name": "Toronto E06", "property_category": "Condo Apt", "hpi_index": 290.9, "benchmark_price": 528900 },

  { "report_month": "2025-12", "area_name": "Toronto E07", "property_category": "Detached", "hpi_index": 311.8, "benchmark_price": 1081900 },
  { "report_month": "2025-12", "area_name": "Toronto E07", "property_category": "Semi-Detached", "hpi_index": 318.3, "benchmark_price": 860800 },
  { "report_month": "2025-12", "area_name": "Toronto E07", "property_category": "Townhouse", "hpi_index": 342.8, "benchmark_price": 728400 },
  { "report_month": "2025-12", "area_name": "Toronto E07", "property_category": "Condo Apt", "hpi_index": 296.4, "benchmark_price": 496200 },

  { "report_month": "2025-12", "area_name": "Toronto E08", "property_category": "Detached", "hpi_index": 310.3, "benchmark_price": 1066700 },
  { "report_month": "2025-12", "area_name": "Toronto E08", "property_category": "Semi-Detached", "hpi_index": 308.2, "benchmark_price": 808800 },
  { "report_month": "2025-12", "area_name": "Toronto E08", "property_category": "Townhouse", "hpi_index": 315.2, "benchmark_price": 607100 },
  { "report_month": "2025-12", "area_name": "Toronto E08", "property_category": "Condo Apt", "hpi_index": 287.2, "benchmark_price": 458900 },

  { "report_month": "2025-12", "area_name": "Toronto E09", "property_category": "Detached", "hpi_index": 331.6, "benchmark_price": 911000 },
  { "report_month": "2025-12", "area_name": "Toronto E09", "property_category": "Semi-Detached", "hpi_index": 311.5, "benchmark_price": 771300 },
  { "report_month": "2025-12", "area_name": "Toronto E09", "property_category": "Townhouse", "hpi_index": 362.5, "benchmark_price": 612200 },
  { "report_month": "2025-12", "area_name": "Toronto E09", "property_category": "Condo Apt", "hpi_index": 341.0, "benchmark_price": 484200 },

  { "report_month": "2025-12", "area_name": "Toronto E10", "property_category": "Detached", "hpi_index": 318.9, "benchmark_price": 1069600 },
  { "report_month": "2025-12", "area_name": "Toronto E10", "property_category": "Semi-Detached", "hpi_index": 306.0, "benchmark_price": 798400 },
  { "report_month": "2025-12", "area_name": "Toronto E10", "property_category": "Townhouse", "hpi_index": 384.2, "benchmark_price": 603900 },
  { "report_month": "2025-12", "area_name": "Toronto E10", "property_category": "Condo Apt", "hpi_index": 223.5, "benchmark_price": 386800 },

  { "report_month": "2025-12", "area_name": "Toronto E11", "property_category": "Detached", "hpi_index": 336.9, "benchmark_price": 980500 },
  { "report_month": "2025-12", "area_name": "Toronto E11", "property_category": "Semi-Detached", "hpi_index": 363.1, "benchmark_price": 790800 },
  { "report_month": "2025-12", "area_name": "Toronto E11", "property_category": "Townhouse", "hpi_index": 337.4, "benchmark_price": 596500 },
  { "report_month": "2025-12", "area_name": "Toronto E11", "property_category": "Condo Apt", "hpi_index": 353.7, "benchmark_price": 427300 }
];

async function importData() {
  console.log(`Starting import of ${rawData.length} rows for 2025-12...`);

  const { data, error } = await supabase
    .from('market_hpi')
    .upsert(rawData, {
      onConflict: 'report_month, area_name, property_category',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('❌ Import Error:', error);
  } else {
    console.log('✅ Success! Data imported to Supabase.');
  }
}

importData();
