const jobRepository = require('../src/repositories/jobRepository');

const baseJob = {
  companyId: 7,
  createdBy: 11,
  title: 'Repository Engineer',
  description: 'Build reliable repository behavior.',
  requirements: 'Node.js and SQL',
  location: 'Remote',
  employmentType: 'Full-time',
  closesAt: null,
};

beforeEach(() => jobRepository._reset());

describe('job repository', () => {
  test('creates draft jobs and returns a defensive copy', async () => {
    const created = await jobRepository.create(baseJob);
    expect(created).toMatchObject({
      companyId: 7,
      createdBy: 11,
      status: 'DRAFT',
      title: 'Repository Engineer',
    });

    created.title = 'Mutated outside repository';
    const loaded = await jobRepository.findById(created.id);
    expect(loaded.title).toBe('Repository Engineer');
  });

  test('filters public jobs and can scope staff queries by company', async () => {
    const draft = await jobRepository.create(baseJob);
    const published = await jobRepository.create({ ...baseJob, companyId: 8, title: 'Published Job' });
    await jobRepository.setStatus(published.id, 'PUBLISHED');

    expect((await jobRepository.list()).map((job) => job.id)).toEqual([published.id]);
    expect((await jobRepository.list({ includeUnpublished: true, companyId: 7 })))
      .toEqual([expect.objectContaining({ id: draft.id })]);
    expect(await jobRepository.findById(draft.id, { companyId: 8 })).toBeNull();
  });

  test('updates only supplied fields and supports clearing nullable fields', async () => {
    const created = await jobRepository.create(baseJob);
    const updated = await jobRepository.update(created.id, {
      title: 'Updated title',
      location: null,
    });

    expect(updated.title).toBe('Updated title');
    expect(updated.location).toBeNull();
    expect(updated.requirements).toBe(baseJob.requirements);
  });

  test('returns null for missing records and applies lifecycle timestamps', async () => {
    expect(await jobRepository.update(999, { title: 'Missing' })).toBeNull();
    expect(await jobRepository.setStatus(999, 'PUBLISHED')).toBeNull();

    const created = await jobRepository.create(baseJob);
    const published = await jobRepository.setStatus(created.id, 'PUBLISHED');
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeTruthy();

    const closed = await jobRepository.setStatus(created.id, 'CLOSED');
    expect(closed.status).toBe('CLOSED');
  });
});
