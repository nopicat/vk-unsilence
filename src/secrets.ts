import { readFileSync } from 'node:fs';
import * as jsYaml from 'js-yaml';
import * as process from 'process';

let secrets: { token: string, adminId: string };

try {
    secrets = jsYaml.load(readFileSync('/run/secrets/vk-unsilence-secrets.yml', 'utf8')) as { token: string, adminId: string };
} catch (e) {
    secrets = {
        token: process.env.TOKEN,
        adminId: process.env.ADMIN_ID,
    };
}

export { secrets };
