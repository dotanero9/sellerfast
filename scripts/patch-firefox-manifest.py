#!/usr/bin/env python3
"""Firefox manifest 补丁：添加 browser_specific_settings"""
import json, sys, os

build_dir = sys.argv[1] if len(sys.argv) > 1 else 'extension/build/firefox-mv2-prod'
manifest_path = os.path.join(build_dir, 'manifest.json')

with open(manifest_path) as f:
    m = json.load(f)

m['browser_specific_settings'] = {
    'gecko': {
        'id': 'sellerfast@dotanero9.github.io',
        'data_collection_permissions': {
            'required': ['none']
        }
    }
}

with open(manifest_path, 'w') as f:
    json.dump(m, f, indent=2)

print(f'Patched {manifest_path} for Firefox')
