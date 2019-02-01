/* The maximum (hyperbolic) distance from the centre of the disc at which the
 * dragging works.  We limit this for numerical stability.
 */
const ACTION_RADIUS = 2;

/* Don't bother redrawing the points if the drag travelled less hyperbolic
 * distance than this (for numerical stability when calculating the exponential
 * map). */
const DISTANCE_THRESHOLD = 0.000001;

/* Points are drawn larger when they are near centre. This is the maximum
 * size. */
const MAX_POINT_SIZE = 7;

const LABEL_OFFSET_X = 5;
const LABEL_OFFSET_Y = 0;
const MIN_FONT_SIZE = 4;

// Point colours.
const COLOR_UNSELECTED = "rgba(0, 0, 255, 0.75)";
const COLOR_SELECTED = "rgba(255, 0, 0)";

// Magnify the displacements when dragging a single point.
const SINGLE_POINT_DRAG_MULTIPLIER = 4;

// The current location of the points (on the hyperboloid)
var points = [
  [-0.5139410485506484, 1.3264616271459857, 1.7388605032252031],
  [3.616672196267621, -0.3840845824324792, 3.771980745141395],
  [0.517764655819748, -0.33788191884747387, 1.175688917146378],
  [0.16125537933307643, -1.723787151044124, 1.9993612578693323]
];

// Edges joining the points: entries are pairs of indices
var edges = [[0, 1], [1, 2], [2, 3], [3, 0]];

/* Whether or not the mouse button is currently down and in the region where
 * dragging is permitted. */
var dragging = false;

/* State variables for dragging a single point. */
const NONE_SELECTED = -1;
// The index of the currently selected point (if any).
var index_of_selected = NONE_SELECTED;
// Where the currently selected point has been dragged to.
var location_of_selected = BASE_PT;

/* The point (on the hyperboloid) represented by where the cursor was last
 * time.  Used for computing the effect of drag of all points simultaneously. */
var last_pt;

// The radius of the canvas disc, in pixels.
var canvas_radius_px;
/* Map a 2-vector on the Poincaré disc to its co-ordinates on the canvas. */
function disc_to_canvas(disc_pt) {
  return [(1 + disc_pt[0]) * canvas_radius_px,
          (1 - disc_pt[1]) * canvas_radius_px];
}

/* Map a 2-vector of canvas coordinates to its corresponding vector on the
 * Poincaré disc. */
function canvas_to_disc(coords) {
  // the vertical coordinate is _down_ on the canvas, hence mult. by -1.
  return [(coords[0] / canvas_radius_px - 1),
          (coords[1] / canvas_radius_px - 1) * -1]
}

/* Return the radius to be used for the depiction of the (hyperboloid) point as
 * a circle on the canvas.
 */
function point_radius(point) {
  var dist = hyperboloid_distance(BASE_PT, point);
  // Shrink the point size by the distance from the centre point
  return Math.max(MAX_POINT_SIZE - 2 * dist, 1);
}

/* Draw the geodesic line segment connecting the two provided hyperboloid
 * points.
 */
function draw_geodesic_segment(pt0, pt1) {
  var ppt0 = hyperboloid_to_disc(pt0);
  var ppt1 = hyperboloid_to_disc(pt1);
  var arc_centre = centre_of_arc_through(ppt0, ppt1);
  var radius = Math.sqrt(dot(arc_centre, arc_centre) - 1);
  var angle0 = clockwise_angle(ppt0, arc_centre);
  var angle1 = clockwise_angle(ppt1, arc_centre);
  var anticlockwise = clockwise_arc_length(angle0, angle1) > Math.PI;
  draw_arc(disc_to_canvas(arc_centre),
           canvas_radius_px * radius,
           angle0, angle1, anticlockwise);
}

/* A simple wrapper of the canvas arc drawing function.
 */
function draw_arc(centre_on_canvas, radius_on_canvas, angle0, angle1, anticlockwise) {
  var canvas = $('#canvas')[0];
  var ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(centre_on_canvas[0],
          centre_on_canvas[1],
          radius_on_canvas,
          angle0, angle1, anticlockwise);
  ctx.stroke();
}

/* Redraw all points and geodesic segments
 */
function draw() {
  var canvas = $('#canvas')[0];
  canvas.width = canvas.width;  // clear the canvas
  $('#parsing_errors').text('');
  $.each(edges, function(index, edge) {
    draw_geodesic_segment(points[edge[0]], points[edge[1]]);
  });
  $.each(points, function(index, point) {
    var color = COLOR_UNSELECTED;
    if (index == index_of_selected) {
      color = COLOR_SELECTED;
    }
    draw_point(point, color, index.toString());  
  });
  if (index_of_selected != NONE_SELECTED) {
    // a single point is being dragged
    draw_geodesic_segment(points[index_of_selected], location_of_selected);
    draw_point(location_of_selected, COLOR_SELECTED);  
  }
  // also update the textareas
  update_coordinates_view();
  $('#edges_input').val(array_to_pretty_string(edges));
}

/* Return true if the coordinates input/display textarea is set to use the
 * hyperboloid, else false (indicating Poincaré disc).
 */
function coords_display_uses_hyperboloid() {
  return $('input[name=ambient_selector]:checked').val() == 'hyperboloid';
}

/* Update the coordinates view, using hyperboloid or Poincaré disc coordinates
 * as appropriate.
 * */
function update_coordinates_view() {
  if (coords_display_uses_hyperboloid()) {
    $('#points_input').val(array_to_pretty_string(points));
  } else {
    // display Poincaré disc co-ordinates instead
    var ppts = [];
    $.each(points, function(index, point) {
      ppts.push(hyperboloid_to_disc(point));
    });
    $('#points_input').val(array_to_pretty_string(ppts));
  }
}

/* Returns the angle of `pt` with respect to a circle centred at `centre`,
 * measured clock-wise from the horizontal.
 * Both points are on the Euclidean plane.
 */
function clockwise_angle(pt, centre) {
  var recentred = sum(pt, scale(-1., centre));
  var anticlockwise_angle = Math.atan2(recentred[1], recentred[0]);
  return -1 * anticlockwise_angle;
}

/* Return the length of the clockwise circular arc beginning at angle0 and
 * ending at angle1.
 */
function clockwise_arc_length(angle0, angle1) {
  var diff = angle1 - angle0;
  while (diff < 0) {
    diff = diff + 2 * Math.PI;
  }
  return diff;
}

/* Return the canvas coordinates where the provided event (e.g. mousedown or
 * touchdown) occurred */
function get_canvas_coords(event){
  var rect = $('#canvas')[0].getBoundingClientRect();
  var coords = event;
  if (event.originalEvent.touches && event.originalEvent.touches.length > 0) {
    // is a touch event: coords are elsewhere
    coords = event.originalEvent.touches[0];
  }
  return [coords.clientX - rect.left, coords.clientY - rect.top];
}

/* Draw the provided hyperboloid point on the Poincaré disc with the provided
 * label.   */
function draw_point(pt, color, label='') {
  var canvas_pt = disc_to_canvas(hyperboloid_to_disc(pt));
  var point_size = point_radius(pt);
  var font_size = MIN_FONT_SIZE * point_size;

  var ctx = $('#canvas')[0].getContext("2d");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(canvas_pt[0], canvas_pt[1], point_size, 0, Math.PI * 2);
  ctx.font = font_size + 'px Arial';
  ctx.fillText(label,
               canvas_pt[0] + LABEL_OFFSET_X,
               canvas_pt[1] + LABEL_OFFSET_Y);
  ctx.fill();
}

$(document).ready(function() {
  canvas = $('#canvas')[0];
  canvas_radius_px = canvas.width / 2;
  draw();

  $('#update_button').click(function(e) {
    e.preventDefault();
    try {
      if (coords_display_uses_hyperboloid()) {
        points = parse_hyperboloid_points($('#points_input').val());
      } else {
        points = parse_poincare_disc_points($('#points_input').val());
      }
      edges = parse_edges($('#edges_input').val(), points.length - 1);
    } catch(e) {
      $('#parsing_errors').text(e.toString());
      return;
    }
    draw();
  });

  $('#canvas').on('mousedown touchstart', function(e) {
    e.preventDefault();
    var coords = get_canvas_coords(e); 
    var pt = disc_to_hyperboloid(canvas_to_disc(coords));
    if (hyperboloid_distance(BASE_PT, pt) > ACTION_RADIUS) {
      // Ignore clicks that occur too far out since a small drag would
      // have too large an effect
      return;
    }
    /* Iterate over the points to see if the user clicked on one */
    $.each(points, function(index, point) {
      var canvas_pt = disc_to_canvas(hyperboloid_to_disc(point));
      if (euclidean_distance(canvas_pt, coords) <= point_radius(point)) {
        // Click occurred within the point as represented on the canvas
        index_of_selected = index;
        location_of_selected = point;
      }
    });
    dragging = true;
    if (index_of_selected == NONE_SELECTED) {
      // User is dragging all points simultaneously.
      $('#canvas').css('cursor', 'move');
    } else {
      // User is dragging a single point.
      $('#canvas').css('cursor', 'hand');
    }
    last_pt = pt;
    draw();
  });

  $('#canvas').on('mousemove touchmove', function(e) {
    if (!dragging) {
      $('#canvas').css('cursor', 'default');
      return;
    }
    e.preventDefault();
    var canvas_coords_at_cursor = get_canvas_coords(e); 
    var pt = disc_to_hyperboloid(canvas_to_disc(canvas_coords_at_cursor));
    if (index_of_selected == NONE_SELECTED) {
      // User is dragging all points simultaneously.
      if (hyperboloid_distance(BASE_PT, pt) > ACTION_RADIUS) {
        // Mouse has strayed from action radius, so cancel drag
        dragging = false;
        $('#canvas').css('cursor', 'not-allowed');
        return;
      }

      var dist = hyperboloid_distance(last_pt, pt);
      if (dist > DISTANCE_THRESHOLD) {
        // if distance is too small, then do nothing (for
        // numerical stability)
        var delta = logarithm(last_pt, pt); // hyperboloid tangent representing mouse movement
        for (var i=0; i < points.length; i++) {
          var _log = logarithm(last_pt, points[i]);
          var transported_log = geodesic_parallel_transport(last_pt, delta, _log);
          points[i] = exponential(pt, transported_log);
        }
        last_pt = pt;
      }
    } else {
      /* User is dragging a single point.
       * Calculate the canvas displacement vector
       * between the original point location and the cursor
       * location
       */
      var start_pt = hyperboloid_to_disc(points[index_of_selected]);
      var coords_at_start = disc_to_canvas(start_pt);
      var canvas_disp = sum(canvas_coords_at_cursor, scale(-1, coords_at_start));
      // The vertical coordinate is _down_ on the canvas, correct for that.
      canvas_disp[1] = -1 * canvas_disp[1];
      var disc_disp = scale(1 / canvas_radius_px, canvas_disp);

      // Apply the drag multiplier (this is just UX)
      disc_disp = scale(SINGLE_POINT_DRAG_MULTIPLIER, disc_disp);

      /* Scale using the Euclidean norm of the original point to become a
       * Poincaré disc tangent at that point (with the same length) (this is
       * the conformal scaling)
       * */
      var conformal_scaling = (1 - Math.pow(norm(start_pt), 2)) / 2;
      var disc_tangent = scale(conformal_scaling, disc_disp);
      
      // Calculate the corresponding tangent on the hyperboloid.
      var hyperboloid_tangent = disc_tangent_to_hyperboloid(start_pt, disc_tangent);
      var dist = hyperboloid_tangent_norm(hyperboloid_tangent);
      if (dist > DISTANCE_THRESHOLD) {
        // If distance is too small, then do nothing (for numerical stability).
        location_of_selected = exponential(points[index_of_selected],
                                           hyperboloid_tangent);
      }
    }
    draw();
  });

  $('#canvas').on('mouseup touchend mouseout', function(e) {
    e.preventDefault();
    dragging = false;
    if (index_of_selected != NONE_SELECTED) {
      // User has completed drag of single point: save result.
      points[index_of_selected] = location_of_selected;
    }
    index_of_selected = NONE_SELECTED;
    $('#canvas').css('cursor', 'default');
    draw();
  });

  $('#ambient_selector_form input').change(update_coordinates_view);
});
