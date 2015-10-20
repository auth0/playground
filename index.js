
var codeMirror = CodeMirror;

var editor = codeMirror(document.querySelector('.js-editor'), {
  mode: 'javascript',
  lineWrapping: true,
  lineNumbers: JSON.parse(localStorage.lineNumbers || 'false'),
  extraKeys: {'Ctrl-Space': 'autocomplete', useGlobalScope: false, globalVars: true},
});

var previewEl = document.querySelector('.js-preview');
var errored = false;
var oldCode;

var startTemplate = _.template('var domain = \'contoso.auth0.com\';\nvar clientID = \'DyG9nCwIEofSy66QM3oo5xU6NFs3TmvT\';\n\nvar lock = new Auth0Lock(clientID, domain);\n\lock.show({\n  focusInput: false,\n  popup: true,\n}, function (err, profile, token) {\n  alert(err);\n});');

var scriptTemplate = _.template('<!DOCTYPE html> <html> <head> <title><\/title> <%= scripts %> <\/head> <body><script>window.onerror = function (e, _, line) { parent.postMessage(JSON.stringify({msg: e, line: line}), \'*\'); };<\/script> <script><%= code %><\/script><\/body> <\/html>');

var errorTemplate = _.template('<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre><%= error %><\/pre><\/body> <\/html>');


var scriptTagTemplate = function (src) {
  return _.template('<script src="<%= src %>"><\/script>')({src: src});
};

if (localStorage.text) {
  editor.setValue(localStorage.text);
} else {
  editor.setValue(startTemplate({}));
}

function setError(error) {
  previewEl.src = 'about:blank';
  previewEl.onload = function () {
    previewEl.onload = null;
    var val = errorTemplate({error: error});
    previewEl.contentDocument.open();
    previewEl.contentDocument.writeln(val);
    previewEl.contentDocument.close();
  };
}

window.addEventListener('message', function (e) {
  var error = JSON.parse(e.data);
  setError(JSON.stringify(error.msg) + ' in line: ' + error.line);
  errored = true;
}, false);

function setCode(code, scripts) {
  previewEl.onload = function () {
    previewEl.onload = null;
    var scriptsAsText = scripts.map(scriptTagTemplate).join('');
    var val = scriptTemplate({code: code, scripts: scriptsAsText});
    previewEl.contentDocument.open();
    previewEl.contentDocument.writeln(val);
    previewEl.contentDocument.close();
  };
  previewEl.src = 'about:blank';
  //document.getElementById('preview').src = "/empty.html";
}

function onChange(instance) {
  try {
    var code = instance.getValue();
    var syntax = esprima.parse(code, { tolerant: true, loc: true });
    var errors = syntax.errors;
    var scripts = [
      document.querySelector('.js-lock-url').value
    ];

    if (oldCode === undefined) { oldCode = code; }

    if(!errors.length) {
      localStorage.text = code;
      code = escodegen.generate(syntax);
      setCode(code, scripts);
      oldCode = code;
    } else {
      setError(errors);
      errored = true;
    }
  } catch (e) {
    setError(e);
    errored = true;
  }
}

window.addEventListener('load', function () { onChange(editor); } );

editor.on('change', _.debounce(onChange, 500));
document.querySelector('.js-lock-url').addEventListener('input', function () { onChange(editor); });
