const { detectCategory, detectPriority, jaccardSimilarity } = require('../utils/aiDetection');

describe('detectCategory', () => {
  it('detects road category', () => {
    const result = detectCategory('Large pothole on road', 'The road pavement is broken with a large pothole causing accidents');
    expect(result.category).toBe('road');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects water category', () => {
    const result = detectCategory('Water pipe leaking', 'The water supply pipe is leaking and flooding the street, no drinking water');
    expect(result.category).toBe('water');
  });

  it('detects electricity category', () => {
    const result = detectCategory('Streetlight not working', 'The electricity pole streetlight has been broken for 2 weeks causing a power outage danger');
    expect(result.category).toBe('electricity');
  });

  it('detects sanitation category', () => {
    const result = detectCategory('Garbage not collected', 'Garbage waste and trash has not been collected from the bin for a week');
    expect(result.category).toBe('sanitation');
  });

  it('returns other for unknown text', () => {
    const result = detectCategory('Something random', 'This is a completely random text with no civic keywords at all whatsoever');
    expect(result.confidence).toBeLessThan(50);
  });

  it('returns confidence between 0 and 100', () => {
    const result = detectCategory('Test title', 'Test description');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});

describe('detectPriority', () => {
  it('detects critical priority for emergency keywords', () => {
    const priority = detectPriority('Emergency! Dangerous gas leak', 'There is a dangerous emergency situation with a hazard for all residents');
    expect(priority).toBe('critical');
  });

  it('detects high priority for severe keywords', () => {
    const priority = detectPriority('Severe road damage', 'Major broken road with serious damage causing flooding outage');
    expect(priority).toBe('high');
  });

  it('defaults to medium for neutral text', () => {
    const priority = detectPriority('Issue on road', 'There is a small pothole near the park');
    expect(['medium', 'low']).toContain(priority);
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical text', () => {
    const sim = jaccardSimilarity('pothole road accident civil lines', 'pothole road accident civil lines');
    expect(sim).toBe(1);
  });

  it('returns 0 for completely different text', () => {
    const sim = jaccardSimilarity('road pothole bridge', 'water supply pipe leak');
    expect(sim).toBe(0);
  });

  it('returns value between 0 and 1 for partially similar text', () => {
    const sim = jaccardSimilarity('pothole road broken pavement', 'broken road pothole accident damage');
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it('handles empty strings gracefully', () => {
    const sim = jaccardSimilarity('', 'some text here');
    expect(sim).toBe(0);
  });
});
