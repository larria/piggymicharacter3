export type ParentChallenge = {
  kind: 'pythagorean';
  question: string;
  answer: number;
};

const challenges: ParentChallenge[] = [];
for (let a = 3; a <= 8; a++) {
  for (let b = a; b <= 8; b++) {
    challenges.push({
      kind: 'pythagorean',
      question: `直角三角形的两条直角边分别为 ${a} 和 ${b}，斜边的平方是多少？`,
      answer: a * a + b * b,
    });
  }
}

export function createParentChallenge(previousQuestion?: string, random = Math.random): ParentChallenge {
  const candidates = challenges.filter(challenge => challenge.question !== previousQuestion);
  return {...candidates[Math.floor(random() * candidates.length)]};
}
