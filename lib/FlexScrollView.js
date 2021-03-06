var superDirty = function(/* arguments */) {
  var self = this;

  // _super() is always the 2nd last argument to addedAt/movedTo/removedAt
  arguments[arguments.length-2]();

  // only after _super()'s deferred stuff
  famous.core.Engine.defer(function() {
    // could be destroyed by the time this runs
    if (self.view)
      self.view._isDirty = true;
  });
};

var extension = {

  add: function(child_fview, child_options) {
    var flexView = this.view;
    var target = child_options.target;
    if (target) {
      var dataSource = {};
      dataSource[target] = child_fview.view;
      if (_.isEmpty(flexView.getDataSource())) {
        flexView.setDataSource(dataSource);
      } else {
        dataSource = _.extend(flexView.getDataSource(), dataSource);
        flexView.setDataSource(dataSource);
      }

      flexView.reflowLayout();

      return child_fview;
    }

    if (child_fview._view.name == 'FlexScrollView') {
      this.view.push(child_fview.view, undefined, false);
    } else {
      this.view.push(child_fview.view);
    }
  },

  create: function(options) {
    options = _.extend({
      flow: true,    // smoothly animates renderables when changing the layout
      direction: undefined,   // 0 = X, 1 = Y, undefined = use default from selected layout-function
      autoPipeEvents: true,
      mouseMove: true,
      nodeSpring: {
        dampingRatio: 0.6,
        period: 600
      }
    }, options);

    if (typeof options.layout === 'string') {
      if (Flex[options.layout])
        options.layout = Flex[options.layout];
      else
        throw new Error("[FlexLayoutController] No such Layout " + options.layout);
    }

    var node = new this._view.constructor(options);

    /*
     * If no dataSource is specified, expect a typical famousEach setup
     */
    if (!options.dataSource) {
      // Quick hack for init order
      node.sequenceFrom = function(source) {
        node.setDataSource(source);
      };
    }

    // auto pipe to a parent ContainSurface
    if (this.parent._view && this.parent._view.name === 'ContainerSurface')
      this.container = this.parent.view;
    if (this.container) {
      /* BUG: when using like this(in ContainerSurface an FlexScrollView is embedded):
       *    {{#EdgeSwapper target="content" modifier="StateModifier" id="homeBody"}}
       *       {{#ContainerSurface id="homeBodyContainer"}}
       *         {{>showContent name=currentContent}}
       *       {{/ContainerSurface}}
       *     {{/EdgeSwapper}}
       *
       * below code would break scrolling when currentContent is changed. Seems like,
       * input events were not piped to FlexScrollView.
       *
      *//*----------------------------------------------------------------------------*//*
      node.subscribe(this.container);
      EventHandler.setInputHandler(this.container, node);
      EventHandler.setOutputHandler(this.container, node);      
      */
      this.parent.view.pipe(node);
    }

    return node;
  },

  famousCreatedPost: function() {
    if (!this.container)
      this.pipeChildrenTo = this.parent.pipeChildrenTo ?
        [ this.view, this.parent.pipeChildrenTo[0] ] :
        [ this.view ];
  },

  attrUpdate: function(key, value, oldValue, data, firstTime) {

    if (key === 'layout') {
      if (typeof value === 'string') {
        if (Flex[value])
          return this.view.setLayout(Flex[value]);
        else
          throw new Error("[FlexLayoutController] No such Layout " + value);
      } else
        return this.view.setLayout(value);
    }

    if (key === 'direction')
      return this.view.setDirection(value);

    if (key === 'layoutOptions')
      return this.view.setLayoutOptions(value);

  },

  addedAt: superDirty,
  movedTo: superDirty,
  removedAt: superDirty
};

var EventHandler = null;
FView.ready(function() {
  EventHandler = famous.core.EventHandler;

  FView.registerView('FlexLayoutController', Flex.LayoutController, extension);
  FView.registerView('FlexScrollView', Flex.FlexScrollView, extension);
});
