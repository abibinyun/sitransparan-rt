#!/usr/bin/env python3
import os
import re
import sys

VAULT_DIR = "docs"

if not os.path.isdir(VAULT_DIR):
    print("Pre-commit: docs/ directory not found, skipping vault check.")
    sys.exit(0)

all_files = set()
for root, dirs, files in os.walk(VAULT_DIR):
    for f in files:
        if f.endswith(".md") or f.endswith(".canvas"):
            rel = os.path.relpath(os.path.join(root, f), VAULT_DIR)
            all_files.add(rel)

link_pattern = re.compile(r"\[\[(.*?)\]\]")
broken_links = []

for root, dirs, files in os.walk(VAULT_DIR):
    for f in files:
        if f.endswith(".md"):
            filepath = os.path.join(root, f)
            with open(filepath, "r", encoding="utf-8") as fh:
                content = fh.read()
            links = link_pattern.findall(content)
            for link in links:
                target = link.split("|")[0].strip()
                if not target.endswith(".md") and not target.endswith(".canvas"):
                    target_md = target + ".md"
                else:
                    target_md = target
                
                # Check direct path or base name
                if target_md not in all_files and os.path.basename(target_md) not in [os.path.basename(x) for x in all_files]:
                    broken_links.append((filepath, link, target_md))

if broken_links:
    print("\n❌ [GIT PRE-COMMIT HOOK] Obsidian Documentation Vault Validation FAILED!")
    print("Found broken or stale wikilinks in docs/:")
    for filepath, link, target in broken_links:
        print(f"  • In {filepath}: [[{link}]] -> file '{target}' does not exist.")
    print("\n💡 Please fix the broken links or create the target file before committing.")
    print("Refer to AGENTS.md §46.12 (Living Documentation Governance).\n")
    sys.exit(1)

print("✅ [GIT PRE-COMMIT HOOK] Obsidian Vault Validation PASSED (0 broken links).")
sys.exit(0)
