export function getVoiceColor(voiceId: string): [string, string] {
    let hash = 0;
    for (let i = 0; i < voiceId.length; i++) {
        hash = voiceId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const c1 = `hsl(${hash % 360}, 70%, 60%)`;
    const c2 = `hsl(${(hash + 40) % 360}, 70%, 50%)`;

    return [c1, c2];
}
