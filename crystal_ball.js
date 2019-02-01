const BASE_PT = [0.0, 0.0, 1.0]; // base point of the hyperboloid

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

// Permitted deviation in Minkowski dot product for input points
const MDP_INPUT_TOLERANCE = 1e-9;

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

/* Calculate the Euclidean dot product of two points.
 * Pre: pt0.length == pt1.length
 */
function dot(pt0, pt1) {
  var sum = 0;
  for (var i=0; i < pt0.length; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  return sum;
}

/* Calculate the Euclidean norm
 * */
function norm(pt) {
  var dp = dot(pt, pt);
  return Math.sqrt(dp);
}

/* Calculate the Euclidean distance.
 * Pre: pt0.length == pt1.length
 */
function euclidean_distance(pt0, pt1) {
  return norm(sum(pt0, scale(-1, pt1)));
}

/* Calculate the Minkowski dot product.
 * Pre: pt0.length == pt1.length
 */
function minkowski_dot(pt0, pt1) {
  var sum = 0;
  var n = pt0.length;
  for (var i=0; i < n - 1; i++) {
    sum = sum + pt0[i] * pt1[i];
  }
  sum -= pt0[n-1] * pt1[n-1];
  return sum;
}

/* Calculate the distance between two points on the hyperboloid.
 */
function hyperboloid_distance(pt0, pt1) {
  var mdp = minkowski_dot(pt0, pt1);
  if (mdp > -1) {
    // due finite precision, can be slightly less than -1, in which case
    // arccosh can't be calculated.
    mdp = -1;
  }
  return Math.acosh(-1 * mdp);
}

/* Scale the provided vector, returning a new one.
 */
function scale(scalar, vec) {
  var res = [];
  for (var i=0; i < vec.length; i++) {
    res.push(scalar * vec[i]);
  }
  return res;
}

/* Sum the two vectors, returning a new one.
 * Pre: vec0.length == vec1.length
 */
function sum(vec0, vec1) {
  var res = [];
  for (var i=0; i < vec0.length; i++) {
    res.push(vec0[i] + vec1[i]);
  }
  return res;
}

/* Given a point `pt` on the Poincaré disc (not the origin), return its
 * inversion through the boundary of disc.
 */
function invert_thru_boundary(pt) {
  return scale(1. / dot(pt, pt), pt);
}

/* Given two points on the Poincaré disc not both lying on a ray from the
 * origin, return the centre of the circle that passes through both and
 * meets the disc boundary at right angles.
 * This circle gives the geodesic line segment.
 */
function centre_of_arc_through(pt0, pt1) {
  var mat = [pt0, pt1];
  var target = scale(0.5, [1 + dot(pt0, pt0), 1 + dot(pt1, pt1)]);
  var centre = apply_matrix(invert_matrix(mat), target);
  return centre;
}

/* Return the determinant of the provided 2x2 matrix.
 * (matrices are arrays of arrays).
 */
function determinant(mat) {
  return mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0];
}

/* Return the inverse of the provided 2x2 matrix.
 * Pre: determinant(mat) != 0.
 */
function invert_matrix(mat) {
  var det = determinant(mat);
  return [
    scale(1./ det, [mat[1][1], -1 * mat[0][1]]),
    scale(1./ det, [-1 * mat[1][0], mat[0][0]]),
  ];
}

/* Return the result of applying the provided 2x2 matrix to the provided
 * 2-vector, from the left (so vectors are thought of as columns).
 */
function apply_matrix(mat, vector) {
  var result = [];
  for (var i=0; i < mat.length; i++) {
    result.push(dot(mat[i], vector));
  }
  return result;
}

/* Given a point `base` on the hyperboloid and a tangent `tangent` in its
 * tangent space, return its exponential (as a point on the hyperboloid).
 * Pre: hyperboloid_tangent_norm(tangent) > 0.
 */
function exponential(base, tangent) {
  var norm = hyperboloid_tangent_norm(tangent);
  var a = Math.cosh(norm);
  var b = Math.sinh(norm) / norm;
  return sum(scale(a, base), scale(b, tangent));
}

/* Return the norm of a tangent to the hyperboloid.
 */
function hyperboloid_tangent_norm(vec) {
  var mdp = minkowski_dot(vec, vec);
  return Math.sqrt(mdp);
}

/* Given two points `base` and `other` on the hyperboloid, return the logarithm
 * of `other` in the tangent space of `base`.
 */
function logarithm(base, other) {
  // base and other are points on the hyperboloid
  var mdp = minkowski_dot(base, other);
  var dist = hyperboloid_distance(base, other);
  var proj = sum(other, scale(mdp, base));
  var norm = hyperboloid_tangent_norm(proj);
  return scale(dist / norm, proj);
}

/* Given a point `base` on the hyperboloid and two vectors `direction` and
 * `tangent` in its tangent space, return the geodesic parallel transport of
 * `tangent` along the geodesic parallel to `direction` to a distance of
 * hyperboloid_tangent_norm(direction).
 */
function geodesic_parallel_transport(base, direction, tangent) {
  var norm_of_direction = hyperboloid_tangent_norm(direction);
  var unit_direction = scale(1.0 / norm_of_direction, direction);
  var parallel_component = minkowski_dot(tangent, unit_direction);
  var unit_direction_transported = sum(
      scale(Math.sinh(norm_of_direction), base),
      scale(Math.cosh(norm_of_direction), unit_direction)
  );
  return sum(
      sum(
        scale(parallel_component, unit_direction_transported),
        tangent
      ),
      scale(-1 * parallel_component, unit_direction)
  );
}

/* Map a 3-vector from the hyperboloid to the corresponding 2-vector on the
 * Poincaré disc.
 */
function hyperboloid_to_disc(pt) {
  return [pt[0] / (pt[2] + 1), pt[1] / (pt[2] + 1)];
}

/* Map a 2-vector from the Poincaré disc to the corresponding 3-vector on the
 * hyperboloid.
 */
function disc_to_hyperboloid(pt) {
  var norm_sqd = dot(pt, pt);
  var factor = 2.0 / (1 - norm_sqd);
  var hyper_pt = [factor * pt[0], factor * pt[1], (1 + norm_sqd) / (1 - norm_sqd)];
  return hyper_pt;
}

/* Given a point on the Poincaré disc and a tangent at that point, return the
 * corresponding tangent vector to the hyperboloid (at the corresponding point)
 */
function disc_tangent_to_hyperboloid(disc_pt, disc_tangent) {
  var hyper_pt = disc_to_hyperboloid(disc_pt);
  var dp = dot(disc_pt, disc_tangent);
  var factor = hyper_pt[2] + 1;
  var vec = [hyper_pt[0] * dp + disc_tangent[0],
             hyper_pt[1] * dp + disc_tangent[1],
             factor * dp];
  return scale(factor, vec);
}

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

/* Return a pretty string representation of the provided array.
 */
function array_to_pretty_string(values) {
  return JSON.stringify(values).split(',').join(', ').split('],').join('],\n');
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
      edges = parse_edges($('#edges_input').val());
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

/* Given a string `text` that is a JSON encoding of an Array of points with the
 * specified number of coordinates, (themselves Arrays), return the decoding,
 * raising informative exceptions if this fails.
 */
function parse_points(text, expected_length) {
  var new_points;
  try {
    new_points = JSON.parse(text);
  } catch(e) {
    throw 'Points not valid JSON';
  }
  if (!Array.isArray(new_points)) {
    throw 'Points input must be an array of points.';
  }
  $.each(new_points, function(i, point) {
    if (!Array.isArray(point) || point.length != expected_length) {
      throw 'Point ' + i + ' has length ' + point.length + ', should be ' + expected_length + '.';
    }
    $.each(point, function(j, value) {
      if (isNaN(value)) {
        throw 'Point co-ordinates must be numeric!';
      }
    });
  });
  return new_points;
}

/* Given a string `text` that is a JSON encoding of an Array of points on the
 * Poincaré disc, return the decoding, raising informative exceptions if this
 * fails.
 */
function parse_poincare_disc_points(text) {
  var new_ppoints = parse_points(text, 2);  // expect 2 coords per point
  var new_points = []
  $.each(new_ppoints, function(index, ppoint) {
    if (norm(ppoint) >= 1) {
      throw 'Point ' + index + ' is outside of the Poincaré disc!';
    }
    new_points.push(disc_to_hyperboloid(ppoint));
  });
  return new_points;
}

/* Given a string `text` that is a JSON encoding of an Array of hyperboloid
 * points (themselves Arrays), return the decoding, raising informative
 * exceptions if this fails.
 */
function parse_hyperboloid_points(text) {
  var new_points = parse_points(text, 3);  // expect 3 coords per point
  $.each(new_points, function(i, point) {
    var mdp = minkowski_dot(point, point);
    if (Math.abs(mdp + 1) > MDP_INPUT_TOLERANCE) {
      throw 'Point ' + i + ' has Minkowski dot product ' + mdp + ' != -1.';
    }
  });
  return new_points;
}

/* Given a string that is a JSON-encoding of the edge data, return the edge
 * data, or raise an informative error message if this fails.
 */
function parse_edges(text) {
  var new_edges;
  try {
    new_edges = JSON.parse(text);
  } catch(e) {
    throw 'Edges not valid JSON.';
  }
  if (!Array.isArray(new_edges)) {
    throw 'Edges list should be an array.';
  }
  $.each(new_edges, function(i, edge) {
    if (!Array.isArray(edge) || edge.length != 2) {
      throw 'Each edge should be an array of length 2.';
    }
    $.each(edge, function(j, value) {
      if (!Number.isInteger(value)) {
        throw 'Edge index ' + value + ' is not an integer!';
      }
      if (value < 0 || value >= points.length) {
        throw 'Edge index ' + value + ' is out of range (use 0-offset).';
      }
    });
  });
  return new_edges;
}
