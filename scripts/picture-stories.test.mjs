import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { PICTURE_STORIES } from '../src/data/pictureStories.js';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('eight free picture story tests have copied images and sample answers', async () => {
  assert.equal(PICTURE_STORIES.length, 8);
  assert.deepEqual(PICTURE_STORIES.map((story) => story.id), ['1', '2', '3', '4', '5', '6', '7', '8']);

  for (const story of PICTURE_STORIES) {
    assert.ok(story.sampleAnswer.length > 200, `${story.title} should include the complete sample story`);
    await access(new URL(`../public${story.image}`, import.meta.url));
  }

  assert.match(PICTURE_STORIES[0].sampleAnswer, /road safety awareness among his fellow students/);
  assert.match(PICTURE_STORIES[1].sampleAnswer, /without putting themselves in unnecessary danger/);
  assert.match(PICTURE_STORIES[2].sampleAnswer, /temporary accommodation and essential supplies/);
  assert.match(PICTURE_STORIES[3].sampleAnswer, /elderly citizens in public places/);
  assert.match(PICTURE_STORIES[4].sampleAnswer, /renewed commitment to public safety/);
  assert.match(PICTURE_STORIES[5].sampleAnswer, /protect the local environment/);
  assert.match(PICTURE_STORIES[6].sampleAnswer, /practical technological solutions for everyday problems/);
  assert.match(PICTURE_STORIES[7].sampleAnswer, /building trust in society/);
});

test('picture story practice is linked from ISSB psychology and uses a 150-second reveal gate', () => {
  assert.match(appSource, /id: 'picture-stories', title: 'Picture Story Writing Test'/);
  assert.match(appSource, /'issb-picture-stories': '\/issb\/psychological-tests\/picturestories'/);
  assert.match(appSource, /now - previous\.startedAt >= 150_000/);
  assert.match(appSource, /View sample answer/);
  assert.match(appSource, /pictureStorySession\.completed \? 'Your story' : 'Write your story before the timer ends'/);
  assert.match(appSource, /case 'issb-picture-story':\s+return renderPictureStoryTestPage\(\);/);
});
