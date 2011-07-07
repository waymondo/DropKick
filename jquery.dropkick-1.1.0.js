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
      '<a class="dk_toggle" style="width: {{ width }};">',
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
    close  : _handleClose,       // Triggered when a DropKick is closed
    open   : _handleOpen,        // Triggered when a DropKick is opened
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

  $('.' + dkClasses.toggle).live('mousedown', function (e) {
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

  $('label[for]').live('click', function (e) {
    var dkTarget = $('#dk_container_' + $(this).attr('for'));
    if (dkTarget.length) {
      dkTarget.focus();
    }
  });

  // Setup keyboard nav
  $(document).bind('keydown.dk_nav', function (e) {
    var
      // Look for an open dropdown...
      $open    = $('.dk_container.dk_open'),

      // Look for a focused dropdown
      $focused = $('.dk_container.dk_focus'),

      // Will be either $open, $focused, or null
      dkEl = null
    ;

    // If we have an open dropdown, key events should get sent to that one
    if ($open.length) {
      dkEl = $open;
    } else if ($focused.length && !$open.length) {
      // But if we have no open dropdowns, use the focused dropdown instead
      dkEl = $focused;
    }

    if (dkEl) {
      _handleKeyBoardNav(e, dkEl);
    }
  }).bind('click.dropkick', function (e) {
    var target = $(e.target);
    if (!target.parents('.' + dkClasses.container).length && $('.' + dkClasses.open).length) {
      _closeAll();
    }
  });
});

function _handleKeyBoardNav(e, dkEl) {
  var
    code          = e.keyCode,
    data          = dkEl.data('dropkick'),
    options       = dkEl.find('.dk_options'),
    open          = dkEl.hasClass('dk_open'),
    current       = dkEl.find('.dk_option_current a'),
    currentParent = current.parent(),
    first         = options.find('li').first(),
    last          = options.find('li').last(),
    next,
    prev
  ;

  switch (code) {
    case keyMap.enter:
      if (open) {
        _save(current, dkEl);
      } else {
        _openDropKick(dkEl);
      }
      e.preventDefault();
    break;

    case keyMap.up:
      prev = currentParent.prev('li');
      if (open) {
        if (prev.length) {
          _setCurrent(prev, dkEl);
        } else {
          _setCurrent(last, dkEl);
        }
      } else {
        _openDropKick(dkEl);
      }
      e.preventDefault();
    break;

    case keyMap.down:
      if (open) {
        next = currentParent.next('li').first();
        if (next.length) {
          _setCurrent(next, dkEl);
        } else {
          _setCurrent(first, dkEl);
        }
      } else {
        _openDropKick(dkEl);
      }
      e.preventDefault();
    break;

    case keyMap.esc:
      if (open) {
        _closeDropKick(dkEl);
        e.preventDefault();
      }
    break;
  }
}

/**
 * _handleDkEvent
 *
 * Handy dk:event manager
 */
function _handleDkEvent(evt, data) {
  var callback = (typeof data.cb === 'function') ? data.cb : $.noop;

  switch(data.event) {
    case dkEvents.close:
      callback.call(this.find('.' + dkClasses.options), evt);
      this.removeClass(dkClasses.open);
    break;

    case dkEvents.open:
      callback.call(this.find('.' + dkClasses.options), evt);
      this.addClass(dkClasses.open);
    break;

    case dkEvents.load:
      this.fadeIn(data.speed);
      callback.call(this, evt);
    break;

    case dkEvents.change:
      callback.call(this, data.value, data.label);
    break;
  }
}

/**
 * _closeDropKick
 *
 * Closes a selected DropKick element
 *
 * Triggers dk:close event
 */
function _closeDropKick(dkEl) {
  var callbacks = dkEl.data('dropkick:callbacks');
  dkEl.trigger(dkEvent, [{
    event: dkEvents.close,
    cb: callbacks.close
  }]);
}

/**
 * _openDropKick
 *
 * Opens a selected DropKick element
 *
 * Triggers dk:open event
 */function _openDropKick(dkEl) {
  var callbacks = dkEl.data('dropkick:callbacks');

  if ($('.dk_focus').length) {
    $('.dk_focus').not(dkEl).removeClass(dkClasses.focus);
  }

  if ($('.dk_open').length) {
    _closeAll();
  };

  dkEl.trigger(dkEvent, [{
    event: dkEvents.open,
    cb: callbacks.open
  }]);

  _scrollMenu(dkEl.find('.dk_option_selected'), dkEl);
}

/**
 * _closeAll
 *
 * Closes all currently open dropdowns
 * Triggers dk:close event on each closed element
 */
function _closeAll() {
  $('.dk_open').each(function () {
    _closeDropKick($(this));
  });
}

/**
 * _scrollMenu
 *
 * Scroll a DropKick menu to a specified location
 */
function _scrollMenu(toEl, dkEl) {
  var inner = dkEl.find('.' + dkClasses.menu);
  var to = toEl.prevAll('li').length * toEl.prevAll('li').outerHeight();

  if (to) {
    inner.animate({ scrollTop : to + 'px' }, 0);
  }
}

/**
 * _setCurrent
 *
 * Adds a 'current' class to the current option
 */
function _setCurrent(curEl, dkEl) {
  dkEl.find('.' + dkClasses.current).removeClass(dkClasses.current);
  curEl.addClass(dkClasses.current);

  _scrollMenu(curEl, dkEl);
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
  _setCurrent(optEl.parent(), dkEl);
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
  html = html.replace('{{ width }}', view.width);

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

    // Only allow this to run once
    if ($(this).data('dropkick') && $(this).data('dropkick').id) {
      return $(this);
    }

    var
      // Save a reference to the select list
      el = $(this),

      // Check if the current <select> is contained within a form
      parentForm = el.parents('form').length ? el.parents('form').first() : null,

      // Save the original value of the select
      original = el.find(':selected') || el.find('option').first(),

      // Applied to the .dk_container element
      id = el.attr('name') || el.attr('id'),

      // Enforce tabability
      tabindex  = el.attr('tabindex') || '1',

      // Save a reference to every <option>
      optionTags = el.find('option'),

      // We store things in the data('dropkick') attribute so <selects> can
      // reference their respective DropKick menu
      data       = el.data('dropkick') || {},

      // Enforce fixed width
      width      = settings.width || el.outerWidth(),

      // Template variable placeholder
      template   = {},

      // Callbacks that get triggered during certain dkevents
      callbacks  = {
        change : settings.change,
        load   : settings.load,
        open   : settings.open,
        close  : settings.close
      },

      // Placeholders
      html,
      dkEl,
      theme
    ;

    data.selectEl   = el;
    data.original   = original;
    data.id         = id;
    data.parentForm = parentForm;

    template.tabindex  = tabindex;
    template.label     = original.text();
    template.id        = id;
    template.options   = optionTags;
    template.original  = original.val();
    template.width     = width + 'px';

    // Turn the template into a real DropKick element
    dkEl = $(_renderMenu(dkTpl, template));

    // Hide the <select> and place the dkEl object in front of it
    el.hide().before(dkEl);

    // Stash some data attributes
    el.data('dropkick', data);
    dkEl.data('dropkick', data);
    dkEl.data('dropkick:callbacks', callbacks);

    // Trigger a dk:load event
    dkEl.trigger(dkEvent, [{
      event: dkEvents.load,
      cb: settings.load,
      speed: settings.speed
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
    var dkEl = $(this), resetEl = dkEl.find('.dk_option_selected');
    _save(resetEl, dkEl);
    _setCurrent(resetEl, dkEl);
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
