/**
 * DropKick.js
 * v1.1.0
 *
 * Highly customizable <select> lists
 * https://github.com/JamieLottering/DropKick

 * Copyright 2011 Jamie Lottering
 * https://github.com/JamieLottering/DropKick/blob/master/LICENSE
 */

(function ($, win, doc) {

var
  // Plugin will refuse to init if this is true
  ie6 = false,

  // Public methods get attached to this
  // Exposes them to $.fn.dropkick('method', arg1, arg2, ...)
  methods = {},

  // Convenience labels for keyboard navigation
  keyMap = {
    'enter' : 13,
    'esc'  : 27,
    'left' : 37,
    'up'   : 38,
    'right' : 39,
    'down' : 40
  },

  // Default HTML template for dropkick dropdowns
  dkTpl = [
    '<div class="dk_container" id="dk_container_{{ id }}" tabindex="{{ tabindex }}">',
      '<a class="dk_toggle">',
        '<span class="dk_label">{{ label }}</span>',
      '</a>',
      '<div class="dk_options">',
        '<ul class="dk_options_inner">',
          '{{ inner }}',
        '</ul>',
      '</div>',
    '</div>'
  ].join(''),

  optionTpl = [
    '<li class="{{ current }}">',
      '<a data-dk-dropdown-value="{{ value }}">{{ text }}</a>',
    '</li>'
  ].join(''),

  // Store some references to commonly used classes
  dkClasses = {
    open      : 'dk_open',
    focus     : 'dk_focus',
    container : 'dk_container',
    toggle    : 'dk_toggle',
    label     : 'dk_label',
    current   : 'dk_option_current',
    selected  : 'dk_option_selected',
    dropdown  : 'dk_options',
    menu      : 'dk_options_inner',
    options   : 'dk_options'
  },

  // This is the main dk:event catchall
  dkEvent = 'dk:event',

  // Every DropKick listens for this events
  dkEvents = {
    close  : 'dk:close',
    change : 'dk:change',
    load   : 'dk:load',
    reset  : 'dk:reset',
    open   : 'dk:open'
  },

  // Some of the best defaults I have ever seen...
  defaults = {
    speed  : 1000,               // Fade-in speed for DropKicks.
    theme  : 'dk_theme_default', // Default css theme applied to .dk_container
    change : $.noop,             // <select> list onchange proxy
    close  : _handleClose,             // Triggered when a DropKick is closed
    open   : _handleOpen,             // Triggered when a DropKick is opened
    load   : $.noop              // Triggered when the menu is rendered and inserted into the DOM
  }
;

function _handleOpen() {
  this.show();
}

function _handleClose() {
  this.hide();
}

// Hide <select>'s that are about to be dropkicked in the face
// Helps reduce the change of a flash of unstyled content (fouc)
doc.documentElement.className = doc.documentElement.className + ' dk_fouc';

// Bind Events
$(function () {
  $('.' + dkClasses.container).live(dkEvent, function (e, data) {
    _handleDkEvent.call($(this), e, data);
  }).live('focus.dk', function (e) {
    $(this).addClass(dkClasses.focus);
  });

  $('.' + dkClasses.toggle).live('click', function (e) {
    var dkEl = $(this).parents('.dk_container').first();
    if(dkEl.hasClass(dkClasses.open)) {
      _closeDropKick(dkEl);
    } else {
      _openDropKick(dkEl);
    }
    e.preventDefault();
    return false;
  });

  $('.' + dkClasses.options).find('a').live('click', function (e) {
    _save($(this), $(this).parents('.' + dkClasses.container).first());
    e.preventDefault();
    return false;
  });

  // Setup keyboard nav
  $(document).bind('keydown.dk_nav', function (e) {
    var
      // Look for an open dropdown...
      $open    = $('.dk_container.dk_open'),

      // Look for a focused dropdown
      $focused = $('.dk_container.dk_focus'),

      // Will be either $open, $focused, or null
      $dk = null
    ;

    // If we have an open dropdown, key events should get sent to that one
    if ($open.length) {
      $dk = $open;
    } else if ($focused.length && !$open.length) {
      // But if we have no open dropdowns, use the focused dropdown instead
      $dk = $focused;
    }

    if ($dk) {
      _handleKeyBoardNav(e, $dk);
    }
  }).bind('click.dropkick', function (e) {
    var target = $(e.target);
    if (!target.parents('.' + dkClasses.container).length && $('.' + dkClasses.open).length) {
      _closeAll();
    }
  });
});

function _handleKeyBoardNav(e, $dk) {
  var
    code     = e.keyCode,
    data     = $dk.data('dropkick'),
    options  = $dk.find('.dk_options'),
    open     = $dk.hasClass('dk_open'),
    current  = $dk.find('.dk_option_current a'),
    curPar   = current.parent(),
    first    = options.find('li').first(),
    last     = options.find('li').last(),
    next,
    prev
  ;

  switch (code) {
    case keyMap.enter:
      if (open) {
        _save(current, $dk);
      } else {
        _openDropKick($dk);
      }
      e.preventDefault();
    break;

    case keyMap.up:
      prev = curPar.prev('li');
      if (open) {
        if (prev.length) {
          _setCurrent(prev, $dk);
        } else {
          _setCurrent(last, $dk);
        }
      } else {
        _openDropKick($dk);
      }
      e.preventDefault();
    break;

    case keyMap.down:
      if (open) {
        next = curPar.next('li').first();
        if (next.length) {
          _setCurrent(next, $dk);
        } else {
          _setCurrent(first, $dk);
        }
      } else {
        _openDropKick($dk);
      }
      e.preventDefault();
    break;

    default:
    break;
  }
}

/**
 * _handleDkEvent
 *
 * Handles all dk:event triggers
 */
function _handleDkEvent(evt, data) {
  var
    event  = data.event || null,
    value  = data.value || '',
    label  = data.label || '',
    option = data.option || null,
    cb     = data.cb || $.noop
  ;

  switch(event) {
    case dkEvents.close:
    case dkEvents.open:
      cb.call(this.find('.' + dkClasses.options), evt);
    break;
    case dkEvents.load:
      cb.call(this, evt);
    break;
    case dkEvents.change:
      cb.call(this, value, label);
    break;
    case dkEvents.reset:
      alert('holy fuck!!');
    break;
    default:
    break;
  }
}

// Private!
function _closeDropKick(dkEl) {
  var callbacks = dkEl.data('dropkick:callbacks');
  dkEl.removeClass(dkClasses.open);
  dkEl.trigger(dkEvent, [{
    event: dkEvents.close,
    cb: callbacks.close
  }]);
}

// Opens a DropKick menu and closes all other open ones
function _openDropKick(dkEl) {
  var callbacks = dkEl.data('dropkick:callbacks');

  _closeAll(callbacks.close);

  dkEl.addClass(dkClasses.open);
  dkEl.trigger(dkEvent, [{
    event: dkEvents.open,
    cb: callbacks.open
  }]);
}

/**
 * _closeAll
 *
 * Closes all currently open dropdowns
 */
function _closeAll(cb) {
  
  $('.' + dkClasses.container).removeClass(dkClasses.open);
}

/**
 * _scrollMenu
 *
 * Scroll a DropKick menu to a specified location
 */
function _scrollMenu(to, dkEl) {
  dkEl.find('.' + dkClasses.options).animate({ scrollTop : to + 'px' }, 0);
}

/**
 * _setCurrent
 *
 * Adds a 'current' class to the current option
 */
function _setCurrent(curEl, dkEl) {
  var
    opt        = curEl.parent(),
    howFarDown = opt.prevAll('li').outerHeight() * opt.prevAll('li').length
  ;

  dkEl.find('.' + dkClasses.current).removeClass(dkClasses.current);
  opt.addClass(dkClasses.current);
  _scrollMenu(howFarDown, dkEl);
}

/**
 * _updateLabel
 *
 * Updates the .dk_label text
 */
function _updateLabel(label, dkEl) {
  dkEl.find('.' + dkClasses.label).text(label);
}

/**
 * _updateValue
 *
 * Updates the <select> value
 */
function _updateValue(value, dkEl) {
  var selectEl = dkEl.data('dropkick').selectEl;
  selectEl.val(value);
}

/**
 * _save
 *
 * Does a few things...
 * 1: Updates the value of the original select element
 * 2: Applies the 'current' class to the clicked option
 *    and updates the DropKick label
 * 3: Triggers a change event on the DropKick Element (dkEl)
 */
function _save(optEl, dkEl) {
  var
    callbacks = dkEl.data('dropkick:callbacks'),
    label     = optEl.text(),
    value     = optEl.attr('data-dk-dropdown-value')
  ;

  _updateLabel(label, dkEl);
  _updateValue(value, dkEl);
  _setCurrent(optEl, dkEl);
  _closeDropKick(dkEl);

  dkEl.trigger(dkEvent, [{
    event: dkEvents.change,
    value: value,
    label: label,
    cb: callbacks.change
  }]);
}

/**
 * _renderMenu
 *
 * Returns a copy of dkTpl with variables filled in
 */
function _renderMenu(tpl, view) {
  var
    // Template for the dropdown
    html = tpl,
    rendered = [],
    // Holder of the dropdowns options
    options = view.options,
    dkEl
  ;

  html = html.replace('{{ id }}', view.id);
  html = html.replace('{{ label }}', view.label);
  html = html.replace('{{ tabindex }}', view.tabindex);

  if (options && options.length) {
    for (var i = 0, l = options.length; i < l; i++) {
      var
        optionEl  = $(options[i]),
        current   = [dkClasses.current, dkClasses.selected].join(' '),
        tpl       = optionTpl
      ;

      tpl = tpl.replace('{{ value }}', optionEl.val());
      tpl = tpl.replace('{{ current }}', (optionEl.val() === view.original) ? current : '');
      tpl = tpl.replace('{{ text }}', optionEl.text());

      rendered[rendered.length] = tpl;
    }
  }

  rendered = html.replace('{{ inner }}', rendered.join(''));
  return rendered;
}

methods.init = function (settings) {
  settings = $.extend({}, defaults, settings);

  return this.each(function () {
    var
      // Save a reference to the select list
      el = $(this),
      parentForm = el.parents('form').length ? el.parents('form').first() : null,
      // Save the original value of the select
      original = el.find(':selected') || el.find('option').first(),
      // Applied to the .dk_container element
      id = el.attr('name') || el.attr('id'),
      // Ensure tabability
      tabindex  = el.attr('tabindex') || '1',
      optionTags = el.find('option'),
      data       = el.data('dropkick') || {},
      template   = {},
      width      = settings.width || el.outerWidth(),
      html       = '',
      callbacks  = {
        change : settings.change,
        load   : settings.load,
        open   : settings.open,
        close  : settings.close
      },
      dkEl,
      theme
    ;

    if (data.id) {
      return el;
    }

    data.selectEl   = el;
    data.original   = original;
    data.id         = id;
    data.parentForm = parentForm;

    template.tabindex  = tabindex;
    template.label     = original.text();
    template.id        = id;
    template.options   = optionTags;
    template.original  = original.val();

    dkEl = $(_renderMenu(dkTpl, template));

    el.hide().before(dkEl);
    el.data('dropkick', data);

    dkEl.data('dropkick', data);
    dkEl.data('dropkick:callbacks', callbacks);

    dkEl.find('.' + dkClasses.toggle).css({
      width: width + 'px'
    });

    dkEl.fadeIn(settings.speed);

    dkEl.trigger(dkEvent, [{
      event: dkEvents.load,
      cb: settings.load
    }]);

    dkEl.bind('blur.dk', function (e) {
      $(this).removeClass(dkClasses.focus);
    });

    return el;
  });

};

methods.reset = function () {
  var el = $(this), dkEls = el.data('dropkick').parentForm.find('.' + dkClasses.container);

  dkEls.each(function () {
    _save($(this).find('.' + dkClasses.selected).find('a'), $(this));
  });
};

// Expose the plugin
$.fn.dropkick = function (method) {
  if (!ie6) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || ! method) {
      return methods.init.apply(this, arguments);
    }
  }
};

})(jQuery, window, document)
