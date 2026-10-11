# Omdurman National Bank — RAG knowledge base (v1.0)

Bilingual (Arabic + English) knowledge base for the ONB customer-service agent. Built 10 Oct 2026 from the bank's public website (onb-sd.com), its published PDFs and news, plus a few third-party sources that are flagged as such.

## What's inside

| File | What it is |
| --- | --- |
| `kb_chunks.jsonl` | **The file to embed.** 258 records: 36 info topics + 93 FAQs, each in English and Arabic. Already chunked — don't re-split. |
| `markdown/` | The same content as 15 readable files, one per category, EN and AR side by side. |
| `kb_review_sheet.csv` | One row per topic/FAQ with EN and AR side by side and an empty `onb_reviewer_notes` column — send this to ONB to sign off. Opens in Excel with Arabic intact. |
| `agent_system_prompt.md` | Rules for the agent: grounding, languages, what it must never do, escalation to 5656. Goes in the system prompt, not the vector store. |
| `open_questions_for_onb.md` | The gaps only ONB can fill (fees, profit rates, limits, hours, SMS codes…). |

## Record schema (`kb_chunks.jsonl`)

```json
{
  "id": "faq-ocash-register.ar",        // unique per language
  "pair_id": "faq-ocash-register",      // same topic in the other language
  "doc_type": "faq",                    // "info" or "faq"
  "lang": "ar",                         // "ar" or "en"
  "category": "digital-ocash",
  "title": "كيف أسجّل في اوو-كاش؟",
  "question": "...", "answer": "...",   // faq only
  "text": "س: ...\nج: ...",             // embed this field
  "tags": ["o-cash", "register"],
  "sources": ["https://www.onb-sd.com/en/EServices/MobileBanking"],
  "source_authority": "bank",           // bank | bank+third_party | third_party | assistant_policy
  "status": "verified",                 // verified | needs_confirmation | policy
  "as_of": null,                        // date the fact refers to, when time-bound
  "last_checked": "2026-10-10",
  "kb_version": "1.0"
}
```

## How to load it

1. Embed the `text` field with a multilingual embedding model (Arabic and English queries must land on the same topics). Store everything else as metadata.
2. At query time, retrieve top 4–6 chunks. Prefer chunks in the user's language (`lang` filter or boost); if the best hit is in the other language, fetch its twin by `pair_id`.
3. Pass `status` to the LLM with each chunk. `needs_confirmation` chunks must be answered with a hedge and a pointer to 5656 or a branch — the system prompt handles this.
4. Re-index the whole file on each version; ids are stable, so you can upsert by `id`.

## Status counts

| Status | Topics | FAQs | Meaning |
| --- | --- | --- | --- |
| verified | 32 | 76 | Stated on onb-sd.com or in a bank document |
| needs_confirmation | 4 | 14 | Partial, third-party, or possibly out of date — confirm with ONB |
| policy | 0 | 3 | Assistant behaviour (never ask for OTP/PIN, can't see accounts, fraud escalation) |

## Sources and limits

- onb-sd.com blocks automated crawling, so pages were read from search-engine copies of the site rather than fetched directly. Every chunk lists its source URLs; ONB should still review the sheet before go-live.
- The SWIFT code (OMDBSDKH), the Google Play listing name (O-CASH), the Telegram bot handle (@ONBsudan_bot), the June 2026 O-Cash launch details and the 2023 rating suspension come from third-party sources and are marked as such.
- An independent fact-check pass corrected the O-Cash launch date (18 June 2026), the app's store name, the bot handle and the rating status.
- Branch status changes often since the war. The branch lists are what the website shows; the agent always tells customers to confirm before visiting.
- Exchange rates are deliberately left out — the agent sends people to the live rates page.
- Not covered yet (see `open_questions_for_onb.md`): fees and charges, financing terms and profit rates, investment deposit terms, card issuance/replacement, SMS command codes, working hours, full branch and ATM lists, transfer limits.

## Updating

Content lives in `kb_info.py` and `kb_faq.py` in the build folder; `python3 build.py` regenerates every file here. Bump `KB_VERSION` when ONB returns the review sheet.
