import { spawn } from 'node:child_process';

export const toUnsilent = (fileId: string) => new Promise<void>((resolve, reject) => {
    const ls = spawn('pipx', [
        'run', 'unsilence',
        'audio/' + fileId + '.mp3',
        'audio/' + fileId + '_output.mp3',
        '-ao',
        '-stt', '0.05',
        '-y',
    ]);

    ls.stdout.on('data', (data) => {
        if (data.toString().includes('Finished')) resolve();
    });
});
