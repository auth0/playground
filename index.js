var codeMirror = CodeMirror;

var editor = codeMirror(document.getElementById('editor'), {
  mode: 'javascript',
  lineWrapping: true,
  lineNumbers: JSON.parse(localStorage.lineNumbers || 'false'),
  extraKeys: {'Ctrl-Space': 'autocomplete', useGlobalScope: false, globalVars: true},
});

var preview = document.getElementById('preview').contentWindow;
var oldCode;

var startTemplate = _.template('var domain = \'mdocs.auth0.com\';\nvar cid = \'yKJO1ckwuY1X8gPEhTRfhJXyObfiLxih\';\n\nvar widget = new Auth0Lock(cid, domain);\n\n\twidget.show({\n\t  focusInput: false,\n      popup: true,\n\t}, function (err, profile, token) {\n\t\talert(err);\n\t});');

var scriptTemplate = _.template('document.write("<!DOCTYPE html> <html> <head> <title><\/title>  <script src=\\\"\/\/cdn.auth0.com\/js\/lock-6.min.js\\\"><\/script>  <\/head> <body> <script> " + <%= code %> + " <\/script><\/body> <\/html>");');

var errorTemplate = _.template('document.write("<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre> <%= error %> <\/pre><\/body> <\/html>");');


if (localStorage.text) {
  editor.setValue(localStorage.text);
} else {
  editor.setValue(startTemplate({}));
}


function setCode(code) {
  document.getElementById('preview').src = 'about:blank';
  //document.getElementById('preview').src = "/empty.html";
  setTimeout(function () {
    var val = scriptTemplate({code: JSON.stringify(code)});
    preview.eval(val);
  });
}

function setError(error) {
  document.getElementById('preview').src = 'about:blank';
  setTimeout(function () {
    var val = errorTemplate({error: error});
    preview.eval(val);
  });
}

var errored = false;
function onChange(instance) {
  try {
    var code = instance.getValue();
    var syntax = esprima.parse(code, { tolerant: true, loc: true });
    var errors = syntax.errors;

    if (oldCode === undefined) { oldCode = code; }

    if(!errors.length) {
      localStorage.text = code;
      code = escodegen.generate(syntax);
      if (code === oldCode && !errored) {
        return;
      }
      setCode(code);
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
