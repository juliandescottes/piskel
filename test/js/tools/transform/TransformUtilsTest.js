describe("TransformUtils suite", function() {
  var A = '#000000';
  var B = '#ff0000';
  var O = Constants.TRANSPARENT_COLOR;

  var HORIZONTAL = pskl.tools.transform.TransformUtils.HORIZONTAL;
  var VERTICAL = pskl.tools.transform.TransformUtils.VERTICAL;

  var CLOCKWISE = pskl.tools.transform.TransformUtils.CLOCKWISE;
  var COUNTERCLOCKWISE = pskl.tools.transform.TransformUtils.COUNTERCLOCKWISE;

  // shortcuts
  var frameEqualsGrid = test.testutils.frameEqualsGrid;
  var toFrameGrid = test.testutils.toFrameGrid;

  /*******************************/
  /************ FLIP *************/
  /*******************************/


  var selectionManager = new pskl.selection.SelectionManager();
  selectionManager.init();

  selection = new pskl.selection.BaseSelection();
  selection.pixels = [];

  selectionManager.currentSelection = selection;
  pskl.app.selectionManager = selectionManager;

  it("flips a frame vertically", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [O, B]
    ]));

    selectionManager.currentSelection = selection;
    // should have flipped
    pskl.tools.transform.TransformUtils.flip(frame, VERTICAL);
    frameEqualsGrid(frame, [
      [O, A],
      [B, O]
    ]);
  });

  it("flips a frame horizontally", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [O, B]
    ]));

    // should have flipped
    pskl.tools.transform.TransformUtils.flip(frame, HORIZONTAL);
    frameEqualsGrid(frame, [
      [O, B],
      [A, O]
    ]);
  });

  it("flips rectangular frame", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [A, O],
      [A, O]
    ]));

    // should have flipped
    pskl.tools.transform.TransformUtils.flip(frame, VERTICAL);
    frameEqualsGrid(frame, [
      [O, A],
      [O, A],
      [O, A]
    ]);

    // should be the same
    pskl.tools.transform.TransformUtils.flip(frame, HORIZONTAL);
    frameEqualsGrid(frame, [
      [O, A],
      [O, A],
      [O, A]
    ]);
  });


  var createPixel = function(row, col, color) {
    return {
      row : row,
      col : col,
      color : color
    };
  };

  it("flips selection", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O, B],
      [O, O, B],
      [O, O, B]
    ]));
    // Select top left 2x2 square
    selection.pixels.push(createPixel(0, 0));
    selection.pixels.push(createPixel(1, 0));
    selection.pixels.push(createPixel(0, 1));
    selection.pixels.push(createPixel(1, 1));
    // should be the same
    pskl.tools.transform.TransformUtils.flip(frame, VERTICAL);
    frameEqualsGrid(frame, [
      [O, A, B],
      [O, O, B],
      [O, O, B]
    ]);
  })

  it("flips normally for nonrectangular selection", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [A, O],
      [A, O]
    ]));

    selection.pixels.push(createPixel(0, 0));
    selection.pixels.push(createPixel(1, 0));
    selection.pixels.push(createPixel(0, 1));
    // should have flipped
    pskl.tools.transform.TransformUtils.flip(frame, VERTICAL);
    frameEqualsGrid(frame, [
      [O, A],
      [O, A],
      [O, A]
    ]);

    // should be the same
    pskl.tools.transform.TransformUtils.flip(frame, HORIZONTAL);
    frameEqualsGrid(frame, [
      [O, A],
      [O, A],
      [O, A]
    ]);
  });

  /*******************************/
  /*********** ROTATE ************/
  /*******************************/

  it("rotates a frame counterclockwise", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [O, B]
    ]));

    // rotate once
    pskl.tools.transform.TransformUtils.rotate(frame, COUNTERCLOCKWISE);
    frameEqualsGrid(frame, [
      [O, B],
      [A, O]
    ]);

    // rotate twice
    pskl.tools.transform.TransformUtils.rotate(frame, COUNTERCLOCKWISE);
    frameEqualsGrid(frame, [
      [B, O],
      [O, A]
    ]);

    // rotate 3
    pskl.tools.transform.TransformUtils.rotate(frame, COUNTERCLOCKWISE);
    frameEqualsGrid(frame, [
      [O, A],
      [B, O]
    ]);

    // rotate 4 - back to initial state
    pskl.tools.transform.TransformUtils.rotate(frame, COUNTERCLOCKWISE);
    frameEqualsGrid(frame, [
      [A, O],
      [O, B]
    ]);
  });

  it("rotates a frame clockwise", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [O, B]
    ]));

    // rotate once
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, A],
      [B, O]
    ]);

    // rotate twice
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [B, O],
      [O, A]
    ]);

    // rotate 3
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, B],
      [A, O]
    ]);

    // rotate 4 - back to initial state
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [A, O],
      [O, B]
    ]);
  });

  it("rotates a rectangular frame", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, O],
      [A, O],
      [B, O],
      [B, O]
    ]));

    // rotate once
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O],
      [B, A],
      [O, O],
      [O, O]
    ]);

    // rotate twice
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O],
      [O, B],
      [O, A],
      [O, O]
    ]);

    // rotate 3
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O],
      [O, O],
      [A, B],
      [O, O]
    ]);

    // rotate 4
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O],
      [A, O],
      [B, O],
      [O, O]
    ]);
  });

  it("rotates a rectangular (horizontal) frame", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [O, O, O, O],
      [A, A, B, B]
    ]));

    // rotate once
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, A, O, O],
      [O, B, O, O]
    ]);

    // rotate twice
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, B, A, O],
      [O, O, O, O]
    ]);

    // rotate 3
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O, B, O],
      [O, O, A, O]
    ]);

    // rotate 4
    pskl.tools.transform.TransformUtils.rotate(frame, CLOCKWISE);
    frameEqualsGrid(frame, [
      [O, O, O, O],
      [O, A, B, O]
    ]);
  });

  /*******************************/
  /*********** CENTER ************/
  /*******************************/

  it("centers a frame", function () {
    // create frame
    var frame = pskl.model.Frame.fromPixelGrid(toFrameGrid([
      [A, B, O, O],
      [B, A, O, O],
      [O, O, O, O],
      [O, O, O, O]
    ]));

    // should be centered
    pskl.tools.transform.TransformUtils.center(frame);
    frameEqualsGrid(frame, [
      [O, O, O, O],
      [O, A, B, O],
      [O, B, A, O],
      [O, O, O, O]
    ]);
  });

});
