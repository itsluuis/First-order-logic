import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('No Native Browser Confirm & Zero Emojis Policy', () => {
  it('Verifies js/app.js has zero occurrences of window.confirm', () => {
    const appPath = path.resolve('js/app.js');
    const appJs = fs.readFileSync(appPath, 'utf-8');
    const matches = appJs.match(/window\.confirm/g);
    assert.equal(matches, null, 'app.js should not use native window.confirm, must use custom in-app modal');
  });

  it('Verifies index.html has zero emojis', () => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    // Broad emoji regex
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    const matches = html.match(emojiRegex);
    assert.equal(matches, null, `index.html should have 0 emojis, found: ${matches ? matches.join(', ') : 'none'}`);
  });

  it('Verifies js/app.js and other key frontend files have zero emojis', () => {
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu;
    for (const f of ['js/app.js', 'js/icons.js', 'css/style.css']) {
      const content = fs.readFileSync(path.resolve(f), 'utf-8');
      const matches = content.match(emojiRegex);
      assert.equal(matches, null, `${f} should have 0 emojis, found: ${matches ? matches.join(', ') : 'none'}`);
    }
  });

  it('Verifies index.html contains modal-confirm element', () => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');
    assert.match(html, /id="modal-confirm"/, 'index.html must contain in-app modal-confirm dialog');
    assert.match(html, /id="btn-confirm-accept"/, 'index.html must contain btn-confirm-accept');
    assert.match(html, /id="btn-confirm-cancel"/, 'index.html must contain btn-confirm-cancel');
  });
});
