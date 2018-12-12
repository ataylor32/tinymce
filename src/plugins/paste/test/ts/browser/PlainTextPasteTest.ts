import { Assertions, Chain, Guard, Pipeline, Log } from '@ephox/agar';
import { UnitTest } from '@ephox/bedrock';
import { Id, Merger, Obj } from '@ephox/katamari';

import EditorManager from 'tinymce/core/api/EditorManager';
import PastePlugin from 'tinymce/plugins/paste/Plugin';
import Theme from 'tinymce/themes/silver/Theme';

import MockDataTransfer from '../module/test/MockDataTransfer';
import ViewBlock from '../module/test/ViewBlock';

UnitTest.asynctest('tinymce.plugins.paste.browser.PlainTextPaste', (success, failure) => {

  const viewBlock = ViewBlock();

  const cCreateEditorFromSettings = function (settings, html?) {
    return Chain.control(
      Chain.async(function (viewBlock: any, next, die) {
        const randomId = Id.generate('tiny-');
        html = html || '<textarea></textarea>';

        viewBlock.update(html);
        viewBlock.get().firstChild.id = randomId;

        EditorManager.init(Merger.merge(settings, {
          selector: '#' + randomId,
          skin_url: '/project/js/tinymce/skins/oxide',
          indent: false,
          setup (editor) {
            editor.on('SkinLoaded', function () {
              setTimeout(function () {
                next(editor);
              }, 0);
            });
          }
        }));
      }),
      Guard.addLogging(`Create editor from ${settings}`)
    );
  };

  const cRemoveEditor = function () {
    return Chain.control(
      Chain.op(function (editor: any) {
        editor.remove();
      }),
      Guard.addLogging('Remove editor')
    );
  };

  const cClearEditor = function () {
    return Chain.control(
      Chain.async(function (editor: any, next, die) {
        editor.setContent('');
        next(editor);
      }),
      Guard.addLogging('Clear editor')
    );
  };

  const cFireFakePasteEvent = function (data) {
    return Chain.control(
      Chain.async(function (editor: any, next, die) {
        editor.fire('paste', { clipboardData: MockDataTransfer.create(data) });
        next(editor);
      }),
      Guard.addLogging(`Fire fake paste event ${data}`)
    );
  };

  const cAssertEditorContent = function (label, expected) {
    return Chain.control(
      Chain.async(function (editor: any, next, die) {
        Assertions.assertHtml(label || 'Asserting editors content', expected, editor.getContent());
        next(editor);
      }),
      Guard.addLogging(`Assert editor content ${expected}`)
    );
  };

  const cAssertClipboardPaste = function (expected, data) {
    const chains = [];

    Obj.each(data, function (data, label) {
      chains.push(
        cFireFakePasteEvent(data),
        Chain.control(
          cAssertEditorContent(label, expected),
          Guard.tryUntil('Wait for paste to succeed.', 100, 1000)
        ),
        cClearEditor()
      );
    });

    return Chain.control(
      Chain.fromChains(chains),
      Guard.addLogging(`Assert clipboard paste ${expected}`)
    );
  };

  const srcText = 'one\r\ntwo\r\n\r\nthree\r\n\r\n\r\nfour\r\n\r\n\r\n\r\n.';

  const pasteData = {
    Firefox: {
      'text/plain': srcText,
      'text/html': 'one<br>two<br><br>three<br><br><br>four<br><br><br><br>.'
    },
    Chrome: {
      'text/plain': srcText,
      'text/html': '<div>one</div><div>two</div><div><br></div><div>three</div><div><br></div><div><br></div><div>four</div><div><br></div><div><br></div><div><br></div><div>.'
    },
    Edge: {
      'text/plain': srcText,
      'text/html': '<div>one<br>two</div><div>three</div><div><br>four</div><div><br></div><div>.</div>'
    },
    IE: {
      'text/plain': srcText,
      'text/html': '<p>one<br>two</p><p>three</p><p><br>four</p><p><br></p><p>.</p>'
    }
  };

  const expectedWithRootBlock = '<p>one<br />two</p><p>three</p><p><br />four</p><p>&nbsp;</p><p>.</p>';
  const expectedWithRootBlockAndAttrs = '<p class="attr">one<br />two</p><p class="attr">three</p><p class="attr"><br />four</p><p class="attr">&nbsp;</p><p class="attr">.</p>';
  const expectedWithoutRootBlock = 'one<br />two<br /><br />three<br /><br /><br />four<br /><br /><br /><br />.';

  Theme();
  PastePlugin();

  viewBlock.attach();

  Pipeline.async({}, [
    Chain.asStep(viewBlock, Log.chains('TBA', 'Paste: Assert forced_root_block <p></p> is added to the pasted data', [
      cCreateEditorFromSettings({
        plugins: 'paste',
        forced_root_block: 'p' // default
      }),
      cAssertClipboardPaste(expectedWithRootBlock, pasteData),
      cRemoveEditor()
    ])),
    Chain.asStep(viewBlock, Log.chains('TBA', 'Paste: Assert forced_root_block <p class="attr"></p> is added to the pasted data', [
      cCreateEditorFromSettings({
        plugins: 'paste',
        forced_root_block: 'p',
        forced_root_block_attrs: {
          class: 'attr'
        }
      }),
      cAssertClipboardPaste(expectedWithRootBlockAndAttrs, pasteData),
      cRemoveEditor()
    ])),
    Chain.asStep(viewBlock, Log.chains('TBA', 'Paste: Assert forced_root_block is not added to the pasted data', [
      cCreateEditorFromSettings({
        plugins: 'paste',
        forced_root_block: false
      }),
      cAssertClipboardPaste(expectedWithoutRootBlock, pasteData),
      cRemoveEditor()
    ]))
  ], function () {
    viewBlock.detach();
    success();
  }, failure);
});