-- "Done before": a place that has already achieved the ask, with its measured
-- result and the page that says so (lib/precedent.ts, shown by
-- components/ask/PrecedentNote). Null when none was found — never filled in
-- from memory. Shape: {"place": text, "summary": text, "sourceUrl": text}.
--
-- Until now these lived in src/lib/mock/precedents.json, so asks added after
-- that file was written lost theirs. The updates below copy the file in; they
-- only fill an empty column, so running this twice changes nothing.

alter table submissions add column if not exists precedent jsonb;

-- Introduce an annual tax on homes kept vacant for over a year
update submissions set precedent = $p${"place": "France", "summary": "Introduced a tax on vacant dwellings in 1999 in large, tight-market cities; it caused a 13% fall in vacancy rates between 1997 and 2001.", "sourceUrl": "https://mpra.ub.uni-muenchen.de/85508/1/MPRA_paper_85508.pdf"}$p$::jsonb
  where id = '27e28811-6faa-4a58-8045-33486b8ddcc4' and precedent is null;

-- Expand India's forest and tree cover by 1 percentage point of land area
update submissions set precedent = $p${"place": "Vietnam", "summary": "Raised forest cover from 28% in 1993 to 41.65% of the country by 2017 through reforestation programmes and forest policy reforms", "sourceUrl": "https://documents1.worldbank.org/curated/en/544891570456214844/pdf/Vietnam-Country-Forest-Note.pdf"}$p$::jsonb
  where id = '2b23b292-58a9-44a8-b9d9-4dd99f7e9109' and precedent is null;

-- Bring Delhi's air within India's own PM2.5 limit
update submissions set precedent = $p${"place": "Beijing, China", "summary": "Cut annual average PM2.5 by 66.5% between 2013 and 2022 through clean air action plans, including a residential coal ban and stricter PM2.5 limits.", "sourceUrl": "https://www.cleanairforhealth.org/beijing"}$p$::jsonb
  where id = 'ffafdce3-0f74-49e2-9b0d-4b9e0cff1a63' and precedent is null;

-- Guarantee free cashless healthcare for every child in India up to age 15
update submissions set precedent = $p${"place": "Vietnam", "summary": "Fully covers children under six in public health insurance; total population coverage rose from 58% in 2009 to 93% in 2023.", "sourceUrl": "https://www.commonwealthfund.org/international-health-policy-center/countries/vietnam"}$p$::jsonb
  where id = 'cd19eaae-5510-48d8-bddc-1b89ac618ab2' and precedent is null;

-- Tap water in every rural home by the government's own deadline
update submissions set precedent = $p${"place": "Telangana, India", "summary": "Built Mission Bhagiratha piped-water grid from 2016; Union Jal Shakti Minister told Rajya Sabha it supplies piped water to every household in the state.", "sourceUrl": "https://en.wikipedia.org/wiki/Mission_Bhagiratha"}$p$::jsonb
  where id = 'aac148e7-df5f-4830-b0b6-371a64916355' and precedent is null;

-- Triple city buses to the government's own benchmark
update submissions set precedent = $p${"place": "Jakarta, Indonesia", "summary": "TransJakarta doubled the number of buses in operation and tripled its routes between January 2016 and February 2020.", "sourceUrl": "https://www.nber.org/digest/20239/designing-public-transit-network-evidence-jakarta"}$p$::jsonb
  where id = '1f885f72-7088-44e9-80e7-94c06c6d5a69' and precedent is null;

-- Treat three-quarters of India's urban sewage
update submissions set precedent = $p${"place": "Chile", "summary": "Raised urban wastewater treatment from about 20% in the 1990s to 100% in private concession areas after reforms admitting private operators from 1998.", "sourceUrl": "https://www.alliance4water.org/wr4er-cases/water-resilience-for-santiago-de-chile"}$p$::jsonb
  where id = '6f130fbf-34d5-44d2-a786-2e37772f7da3' and precedent is null;

-- Start a public bus service in the 400 Indian cities with none
update submissions set precedent = $p${"place": "Indore, Madhya Pradesh", "summary": "Launched a public city bus service in January 2006 through AICTSL; it now runs 188 buses on 32 routes carrying about 250,000 riders daily.", "sourceUrl": "https://en.wikipedia.org/wiki/Indore_City_Bus"}$p$::jsonb
  where id = 'b6f240b1-6b38-4e91-bf43-c48c7cfcfccb' and precedent is null;

-- Legalize regulated adult possession and sale of cannabis across India
update submissions set precedent = $p${"place": "Uruguay", "summary": "Legalized regulated adult cannabis possession and sale in 2013, with pharmacy sales from 2017; a study found no rise in adolescent cannabis use afterward.", "sourceUrl": "https://pubmed.ncbi.nlm.nih.gov/32388170"}$p$::jsonb
  where id = 'f86a0ab9-cae8-4a59-b0ac-9ee90b64f83b' and precedent is null;

-- Give rural homes the same power hours as cities
update submissions set precedent = $p${"place": "Gujarat, India", "summary": "Separated rural household feeders from farm feeders under Jyoti Gram Yojana, giving 18,065 villages 24-hour three-phase power supply.", "sourceUrl": "https://csis-website-prod.s3.amazonaws.com/s3fs-public/200910_Palit_Energy_Gujarat_Background_V.4.pdf"}$p$::jsonb
  where id = '0363450e-5118-4e7c-ab41-1ef5d1aa0281' and precedent is null;

-- Publish every Bengaluru power cut, ward by ward
update submissions set precedent = $p${"place": "Delhi", "summary": "Delhi's Power Department publishes daily unplanned power outage reports online, with month-wise archives covering 2015 to 2018.", "sourceUrl": "https://power.delhi.gov.in/power/daily-power-outage-reportsplanned"}$p$::jsonb
  where id = '6d23b033-624b-4b46-ac44-73c9b9c04f37' and precedent is null;

-- Deliver the 1 crore urban homes promised under PMAY-U 2.0
update submissions set precedent = $p${"place": "Telangana, India", "summary": "Completed over 85% of houses sanctioned under PMAY-Urban between 2016-17 and 2020-21, the highest completion rate among larger states.", "sourceUrl": "https://factly.in/data-less-than-50-of-the-houses-sanctioned-under-pmay-urban-constructed-by-the-end-of-2020-21"}$p$::jsonb
  where id = '605747a1-62b3-44f8-9cb2-8342d96f4efa' and precedent is null;

-- Bring all 1,787 persistently polluted towns into the clean air programme
update submissions set precedent = $p${"place": "China", "summary": "Issued a national Air Pollution Prevention and Control Action Plan in 2013; PM2.5, PM10 and SO2 concentrations fell noticeably across 338 cities by 2017.", "sourceUrl": "https://hero.epa.gov/reference/7715513"}$p$::jsonb
  where id = '843b26a1-1e83-4f0c-9890-77b96013e7f0' and precedent is null;

-- Build 3,000 km of new roads across India and publicly track progress
update submissions set precedent = $p${"place": "Vietnam", "summary": "Put all 23 component projects of the eastern North–South Expressway into operation, reaching the 3,000 km national expressway milestone by end-2025.", "sourceUrl": "https://vietnamnews.vn/society/1732125/expressway-milestone-sets-course-for-5-000km-by-2030.html"}$p$::jsonb
  where id = 'a6ea9e0d-d92b-45c2-adf7-85c8ff9edf8f' and precedent is null;

-- Print the tax on every fuel receipt
update submissions set precedent = $p${"place": "Brazil", "summary": "Transparency Law 12.741/2012 requires approximate taxes (ICMS, IPI, PIS, COFINS and others) on consumer sales documents; billing software was updated to print them.", "sourceUrl": "https://support.microsoft.com/en-us/topic/a-country-specific-update-is-available-to-add-approximate-taxes-in-the-nota-fiscal-document-in-brazil-in-microsoft-dynamics-ax-2012-r2-10c7fbe3-cd73-e52d-e4ae-a63c8c681db1"}$p$::jsonb
  where id = 'cef12b1b-0dea-4ffe-85f4-cb2037dad674' and precedent is null;

-- Raise PM-KISAN to ₹8,000 a year
update submissions set precedent = $p${"place": "Maharashtra", "summary": "Added a state top-up of ₹6,000 to PM-KISAN from October 2023, doubling yearly support to ₹12,000 for roughly 90 lakh farmer families.", "sourceUrl": "https://www.bighaat.com/kisan-vedika/blogs/namo-shetkari-mahasanman-nidhi-benefits-and-beneficiary-status-check"}$p$::jsonb
  where id = '30a419b4-075f-47ce-8eae-b04063ef53ab' and precedent is null;

-- Clear the RTI appeals backlog
update submissions set precedent = $p${"place": "Maharashtra", "summary": "Disposed 84,569 RTI appeals and complaints between April 2025 and May 2026, 21,653 more than received, cutting pendency to 80,276 by June 2026.", "sourceUrl": "https://timesofindia.indiatimes.com/city/pune/states-rti-panel-clears-over-84k-cases-but-still-faces-huge-pendency-burden-with-3-key-vacant-posts/articleshow/132720464.cms"}$p$::jsonb
  where id = '0f5fc9c1-a6e7-44b9-83ab-fd35f474f1ef' and precedent is null;

-- Cut the share of undertrials in Indian prisons to one in two
update submissions set precedent = $p${"place": "Mzuzu, Malawi", "summary": "Camp courts at Mzuzu prison in December 2023 released 65 and sentenced 21 remand prisoners, cutting the prison's remand population by 54%.", "sourceUrl": "https://www.penalreform.org/blog/22251"}$p$::jsonb
  where id = 'a9d8b2cf-69bd-40c5-b043-b647032ce2a8' and precedent is null;

-- Add 50 km to Bengaluru's metro network
update submissions set precedent = $p${"place": "Delhi", "summary": "Built Phase II, adding about 124 km of metro lines between 2006 and 2011, expanding the network from 65 km to 190 km.", "sourceUrl": "https://unepccc.org/wp-content/uploads/2014/08/case-study-of-metro-final.pdf"}$p$::jsonb
  where id = 'f9acfe96-1ee7-49e2-a979-bfe5395511f0' and precedent is null;

-- 24×7 piped water in every Bengaluru ward
update submissions set precedent = $p${"place": "Puri, Odisha", "summary": "Under the Drink from Tap Mission, brought all of Puri's 250,000 residents 24×7 tap-quality piped water by 2021; seven Odisha cities fully covered by 2023.", "sourceUrl": "https://thesourcemagazine.org/myth-busting-clean-piped-water-24x7-for-the-people-of-odisha"}$p$::jsonb
  where id = '151c213a-acb4-46db-b40b-aae5c30b7ccb' and precedent is null;

-- Stop untreated sewage entering Bengaluru's lakes
update submissions set precedent = $p${"place": "Bhopal, Madhya Pradesh", "summary": "Lake Bhopal project (1995–2004) raised sewage treatment capacity in its project area from 4,000 to 58,530 m³/day, diverting sewage previously discharged untreated into lakes.", "sourceUrl": "https://ilec.or.jp/ILBMTrainingMaterials/wp-content/uploads/Sewage_Treatment.pdf"}$p$::jsonb
  where id = '75725e09-1d81-4b63-94aa-adedcef593b2' and precedent is null;

-- Raise Ayushman Bharat cover per family
update submissions set precedent = $p${"place": "Rajasthan", "summary": "Chiranjeevi scheme covers up to ₹25 lakh per family for all Rajasthan families; NFHS 2019-21 found 88% of households insured, India's highest.", "sourceUrl": "https://crispindia.net/assets/files/Publication/E_Book_Evaluation%20of%20Mukhya%20Mantri%20Chiranjeevi%20Swasthya%20Bima%20Yojana%20Govt%20of%20Rajasthan.pdf"}$p$::jsonb
  where id = 'e12d3dbd-dba6-443c-b4d9-56603eb05fb7' and precedent is null;

-- Privatise Bengaluru's municipal corporation services
update submissions set precedent = $p${"place": "Sandy Springs, Georgia, USA", "summary": "Outsourced nearly all non-public-safety municipal services to private contractors from 2005; officials estimated savings of about $20 million per year by around 2010.", "sourceUrl": "https://www.governing.com/archive/sandy-springs-outsources-everything.html"}$p$::jsonb
  where id = '190da650-34f1-4608-ba19-878ddf1bf5b7' and precedent is null;

-- Annual searchable asset declarations for all MPs and MLAs
update submissions set precedent = $p${"place": "Ukraine", "summary": "Launched a public online asset-declaration system for officials in September 2016; by end-2019 over 4 million declarations were freely available to the public.", "sourceUrl": "https://thedocs.worldbank.org/en/doc/457791611679267058-0090022021/original/ReformofAssetandInterestDisclosureinUkraine.pdf"}$p$::jsonb
  where id = '36fb56c3-7d66-40e2-9f1b-1a2bc8b7b8be' and precedent is null;

-- Bring petrol and diesel under GST
update submissions set precedent = $p${"place": "Australia", "summary": "Applied 10% GST to petrol and diesel when GST was introduced in 2001, lowering fuel excise to fully offset the added tax.", "sourceUrl": "https://en.wikipedia.org/wiki/Fuel_taxes_in_Australia"}$p$::jsonb
  where id = '63e52283-8ff9-4ea4-8b71-f7bef14859ae' and precedent is null;

-- Mandate front-of-pack calorie labels on all packaged, loose and restaurant food
update submissions set precedent = $p${"place": "Chile", "summary": "Mandated front-of-pack 'high in' warning labels, including for calories, in 2016; by 2017 households bought 24% fewer calories from labelled products than expected.", "sourceUrl": "https://www.globalfoodresearchprogram.org/study-shows-chilean-policy-package-led-to-declines-in-purchased-calories-sugar-fat-and-sodium"}$p$::jsonb
  where id = '8bef8638-6066-40e2-8825-ad2db8d7d977' and precedent is null;

-- Publish monthly tap-water quality test results for every major Indian city
update submissions set precedent = $p${"place": "Singapore", "summary": "National water agency PUB publishes annual tap-water test results (averages and ranges per parameter, including E. coli) on the government open-data portal for 2023–2025.", "sourceUrl": "https://data.gov.sg/datasets/d_f397c39929978d3047e0e32430c6763b/view"}$p$::jsonb
  where id = 'f863e5be-a3af-4f87-b462-f7e623c4e0ee' and precedent is null;

-- Launch a nationwide awareness campaign on cutting carb-heavy diets to prevent diabetes
update submissions set precedent = $p${"place": "North Karelia, Finland", "summary": "Community-wide diet and lifestyle campaign begun in 1972 cut saturated fat intake by 20% in men and 14% in women over 10 years.", "sourceUrl": "http://www.epi.umn.edu/cvdepi/study-synopsis/north-karelia-project"}$p$::jsonb
  where id = '3811d06f-7ae6-4834-8bbf-93d07837ae79' and precedent is null;

-- Create a licensing pathway for clinical research on psychedelic-assisted therapy
update submissions set precedent = $p${"place": "Canada", "summary": "Reopened restricted-drug access via Special Access Program January 2022; by November 2022 authorized 50 psilocybin patients and approved 16 psilocybin clinical trials, 13 since 2022.", "sourceUrl": "https://search.open.canada.ca/qpnotes/record/hc-sc%2CMH-2022-QP-0026"}$p$::jsonb
  where id = '55bff9d9-ca90-451b-9ddb-d8fb0fc0750c' and precedent is null;

-- Repeal the spousal exception to rape in the Bharatiya Nyaya Sanhita
update submissions set precedent = $p${"place": "Nepal", "summary": "Supreme Court ruling in Meera Dhungana v. Government of Nepal made marital rape a crime; National Penal Code 2017 raised its punishment to five years' imprisonment.", "sourceUrl": "https://resourcehub.bakermckenzie.com/en/-/media/fighting-domestic-violence/reports/reports/2021_fdv_nepal.pdf?rev=b5d3f673a9b848479606a8c1bd5ebb09&sc_lang=en"}$p$::jsonb
  where id = 'cc741387-78b9-4e9b-9dec-963330c49a05' and precedent is null;

-- Publish an annual official valuation of unpaid domestic and care work in India's national accounts
update submissions set precedent = $p${"place": "Mexico", "summary": "INEGI's Satellite Account of Unpaid Household Labor valued unpaid domestic and care work at MX$8.4 trillion, 26.3% of GDP, for 2023.", "sourceUrl": "https://mexicobusiness.news/talent/news/unpaid-household-labor-mexico-represents-263-gdp-inegi"}$p$::jsonb
  where id = '9cacd9cd-576f-4bb5-bb92-18166c4342b2' and precedent is null;

-- Publish monthly ward-wise water hardness test results for Bengaluru online
update submissions set precedent = $p${"place": "Mumbai, Maharashtra", "summary": "Brihanmumbai Municipal Corporation published ward-wise percentages of unfit drinking water samples for April 2023 to March 2025 in its Environment Status Report 2024-25.", "sourceUrl": "https://www.mcgm.gov.in/irj/go/km/docs/documents/MCGM%20Department%20List/Environment/Docs/Environment%20Status%20Report%20%202024-25%20(English).pdf"}$p$::jsonb
  where id = '5cc9e583-61dd-4823-b77a-35b99efd9d67' and precedent is null;

-- Bring PM2.5 in the 20 worst cities under 40 µg/m³ annual mean
update submissions set precedent = $p${"place": "Beijing, China", "summary": "Banned residential coal and eliminated coal boilers under clean air action plans; annual PM2.5 fell from 89.5 µg/m³ in 2013 to 35 µg/m³ in 2022.", "sourceUrl": "https://www.facebook.com/UNHABITAT/posts/from-airpocalypse-to-blue-skies-6-key-policies-that-helped-beijing-slash-air-pol/1018461020316981"}$p$::jsonb
  where id = '1004c1e1-dde8-48e0-9862-076022e7c31d' and precedent is null;

-- Table a constitutional amendment to end caste- and religion-based reservations
update submissions set precedent = $p${"place": "California, United States", "summary": "Constitutional amendment in 1996 banned race and sex preferences in public jobs and education; underrepresented-group enrollment at Berkeley and UCLA fell over 60% afterward.", "sourceUrl": "https://en.wikipedia.org/wiki/1996_California_Proposition_209"}$p$::jsonb
  where id = '9fef2c38-d886-47a1-aa63-5d4607030bc9' and precedent is null;

-- Raise public health spending from 1.9% to 3% of GDP
update submissions set precedent = $p${"place": "Thailand", "summary": "Tripled domestic government health spending per capita from $71 to $212 (constant 2019 US$) between 2000 and 2019.", "sourceUrl": "https://documents1.worldbank.org/curated/en/099052523201027923/pdf/P1771570af8b360b40aab305f0be65a2678.pdf"}$p$::jsonb
  where id = '993cf992-99a1-4081-8ee7-a2423bc9a5ed' and precedent is null;
