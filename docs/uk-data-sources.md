# UK Data Sources

## MVP Coverage Policy

MVP coverage is Contracts Finder-first:

- England and UK central-government opportunities available through Contracts Finder.
- Find a Tender only after API/search/reuse terms are confirmed.
- No complete UK-wide coverage claim.
- Scotland, Wales, and Northern Ireland sources are future integrations.

## Source Review

| Source | Official URL | Method | Coverage | Reuse Notes | MVP Status |
| --- | --- | --- | --- | --- | --- |
| Contracts Finder | https://www.contractsfinder.service.gov.uk/ | Public website plus downloadable XML/CSV datasets documented through GOV.UK/data.gov.uk | UK government and England public-sector opportunities; coverage has scope limits | Confirm current reuse and attribution terms before production ingestion | Priority 1 |
| Find a Tender | https://www.find-tender.service.gov.uk/ | Official API documentation exists, but MVP must confirm public search/query and reuse scope | Above-threshold UK notices | Do not make this primary source until API access and reuse terms are documented | Priority 2 |
| Public Contracts Scotland | https://www.publiccontractsscotland.gov.uk/ | To review | Scotland | To review | Future |
| Sell2Wales | https://www.sell2wales.gov.wales/ | To review | Wales | To review | Future |
| eTendersNI | https://etendersni.gov.uk/ | To review | Northern Ireland | To review | Future |

## Required Fields

```text
source
external_id
title
buyer_name
description
cpv_codes
region
country
estimated_value
currency
published_at
deadline_at
notice_type
procurement_stage
source_url
raw_json or raw_text
last_checked_at
```

## Implementation Notes

- Store source URL and `last_checked_at` for every returned tender.
- Keep raw source payloads where allowed.
- Track content hashes and versions because tender notices can be amended.
- Mark cancelled, closed, awarded, and stale notices explicitly.
- Add attribution and source coverage statements to the landing page.
