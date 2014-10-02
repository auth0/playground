var codeMirror = CodeMirror;

var editor = codeMirror(document.getElementById('editor'), {
  mode: 'javascript',
  lineWrapping: true,
  lineNumbers: JSON.parse(localStorage.lineNumbers || 'false'),
  extraKeys: {'Ctrl-Space': 'autocomplete', useGlobalScope: false, globalVars: true},
});

var preview = document.getElementById('preview').contentWindow;
var oldCode;

var startTemplate = _.template('var domain = \'mdocs.auth0.com\';\nvar cid = \'yKJO1ckwuY1X8gPEhTRfhJXyObfiLxih\';\n\nvar widget = new Auth0Lock(cid, domain);\n\n  widget.show({\n  focusInput: false,\n      popup: true,\n  }, function (err, profile, token) {\n    alert(err);\n  });');

var scriptTemplate = _.template('document.write("<!DOCTYPE html> <html> <head> <title><\/title> " + <%= scripts %> + "   <\/head> <body> <script> " + <%= code %> + " <\/script><\/body> <\/html>");');

var errorTemplate = _.template('document.write("<!DOCTYPE html> <html> <head> <title><\/title> <\/head> <body> <pre> <%= error %> <\/pre><\/body> <\/html>");');

var scriptTagTemplate = function (src) {
  return _.template('<script src=\"<%= src %>\"><\/script>')({src: src});
};

if (localStorage.text) {
  editor.setValue(localStorage.text);
} else {
  editor.setValue(startTemplate({}));
}


function setCode(code, scripts) {
  document.getElementById('preview').src = 'about:blank';
  //document.getElementById('preview').src = "/empty.html";
  setTimeout(function () {
    var scriptsAsText = scripts.map(scriptTagTemplate).join('');
    var val = scriptTemplate({code: JSON.stringify(code), scripts: JSON.stringify(scriptsAsText)});
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
    var scripts = [
      '//cdn.auth0.com/js/lock-6.min.js',
      'https://code.jquery.com/jquery-1.11.1.min.js'
    ];

    if (oldCode === undefined) { oldCode = code; }

    if(!errors.length) {
      localStorage.text = code;
      code = escodegen.generate(syntax);
      if (code === oldCode && !errored) {
        return;
      }
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
