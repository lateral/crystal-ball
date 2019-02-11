// Version 1.0.1

const CLOSENESS = 1e-10;

// example hyperboloid points
const PT0 = [-1.8633600641133867, 3.882820430081896, 4.421357848081741];
const PT1 = [3.200104921212019, -0.7136829700338203, 3.427829471908076];

function assert_vectors_close(assert, vec0, vec1) {
  assert.equal(vec0.length, vec1.length);
  for (var i=0; i < vec0.length; i++) {
    assert.close(vec0[i], vec1[i], CLOSENESS);
  }
}

QUnit.test("examples points are on hyperboloid", function(assert) {
  assert.close(minkowski_dot(PT0, PT0), -1, CLOSENESS);
  assert.close(minkowski_dot(PT1, PT1), -1, CLOSENESS);
});

QUnit.test("dot", function(assert) {
  var dp = dot([1, 2], [-1, 3]);
  assert.ok(dp == 5);
});

QUnit.test("norm", function(assert) {
  assert.close(norm([1, 2]), Math.sqrt(5), CLOSENESS);
});

QUnit.test("euclidean_distance", function(assert) {
  var dist = euclidean_distance([1, 2], [-1, 3]);
  assert.close(dist, Math.sqrt(5), CLOSENESS);
});

QUnit.test("minkowski_dot", function(assert) {
  var mdp = minkowski_dot([0, 1, 3], [1, 4, 1]);
  assert.close(mdp, 1, CLOSENESS);
});

QUnit.test("hyperboloid_distance with exponential", function(assert) {
  var tangent = [1, 2, 0];
  var other_pt = exponential(BASE_PT, tangent);
  dist = hyperboloid_distance(BASE_PT, other_pt);
  assert.close(dist, hyperboloid_tangent_norm(tangent), CLOSENESS);
});

QUnit.test("hyperboloid_tangent_norm", function(assert) {
  var tangent = [1, 2, 0];
  // since is tangent to base pt, should coincide with euclidean norm
  assert.close(hyperboloid_tangent_norm(tangent), norm(tangent), CLOSENESS);
});

QUnit.test("logarithm inverts exponential", function(assert) {
  var tangent = [1, 2, 0];
  var other_pt = exponential(BASE_PT, tangent);
  var _log = logarithm(BASE_PT, other_pt);
  assert_vectors_close(assert, tangent, _log);
});

QUnit.test("exponential inverts logarithm", function(assert) {
  var _log = logarithm(PT0, PT1);
  var _exp = exponential(PT0, _log);
  var dist = hyperboloid_distance(PT1, _exp);
  assert.close(dist, 0, CLOSENESS);
});

QUnit.test("geodesic_parallel_transport", function(assert) {
  var tangent = [1, 2, 0];
  var direction = [3, 0, 0];
  var other_pt = exponential(BASE_PT, direction);
  var transported = geodesic_parallel_transport(BASE_PT, direction, tangent);
  // check that transported is in the tangent space of other_pt
  assert.close(minkowski_dot(transported, other_pt), 0, CLOSENESS);
  // check that it has the same tangent norm
  assert.close(hyperboloid_tangent_norm(transported), hyperboloid_tangent_norm(tangent), CLOSENESS);
});

QUnit.test("hyperboloid_to_disc has expected norm", function(assert) {
  var dist = hyperboloid_distance(BASE_PT, PT0);
  var ppt = hyperboloid_to_disc(PT0);
  assert.close(norm(ppt), Math.tanh(dist / 2), CLOSENESS);
});

QUnit.test("disc_to_hyperboloid inverts hyperboloid_to_disc", function(assert) {
  var pt = disc_to_hyperboloid(hyperboloid_to_disc(PT1));
  var dist = hyperboloid_distance(pt, PT1);
  assert.close(dist, 0, CLOSENESS);
});

QUnit.test("hyperboloid_to_disc inverts disc_to_hyperboloid", function(assert) {
  var ppt = [0.24, -0.3];
  var ppt_recovered = hyperboloid_to_disc(disc_to_hyperboloid(ppt));
  assert_vectors_close(assert, ppt, ppt_recovered);
});

QUnit.test("disc_tangent_to_hyperboloid", function(assert) {
  var tangent = [1, 0];
  var ppt = [0.24, -0.3];
  var hyper_tangent = disc_tangent_to_hyperboloid(ppt, tangent);
  var hyper_pt = disc_to_hyperboloid(ppt);
  // check hyper_tangent is tangent to hyperboloid at hyper_pt
  var mdp = minkowski_dot(hyper_pt, hyper_tangent);
  assert.close(mdp, 0, CLOSENESS);
});

QUnit.test("parse_points vanilla case", function(assert) {
  var pts = parse_points('[[0, 1], [1, 2]]', 2);
  assert.equal(pts.length, 2);
  assert.deepEqual(pts[0], [0, 1]);
  pts = parse_points('[]', 2);
  assert.deepEqual(pts, []);
});

QUnit.test("parse_points checks length", function(assert) {
  var text = '[[0, 1], [1, 2]]';
  assert.throws(function() {
    var pts = parse_points(text, 1);
  });
});

QUnit.test("parse_points checks numerics", function(assert) {
  var text = '[[0, "a"], [1, 2]]';
  assert.throws(function() {
    var pts = parse_points(text, 2);
  });
});

QUnit.test("parse_points expects JSON", function(assert) {
  var text = '[[0, "a"], [1, 2]';
  assert.throws(function() {
    var pts = parse_points(text, 2);
  });
});

QUnit.test("parse_points inverts array_to_pretty_string", function(assert) {
  var pts = [PT0, PT1];
  var text = array_to_pretty_string(pts);
  assert.deepEqual(parse_points(text, 3), pts);
});

QUnit.test("parse_poincare_disc_points", function(assert) {
  var pts = [[0, 0.3], [0.2, -0.1]];
  var text = array_to_pretty_string(pts);
  var hpts = parse_poincare_disc_points(text, 2);
  assert_vectors_close(assert, hpts[0], disc_to_hyperboloid(pts[0]));
});

QUnit.test("parse_poincare_disc_points checks constraint", function(assert) {
  var not_in_disc = [1, 0];
  var text = array_to_pretty_string([not_in_disc]);
  assert.throws(function() {
    var pts = parse_poincare_disc_points(text, 2);
  });
});

QUnit.test("parse_hyperboloid_points", function(assert) {
  var pts = [PT0, PT1];
  var text = array_to_pretty_string(pts);
  assert.deepEqual(parse_hyperboloid_points(text, 3), pts);
});

QUnit.test("parse_hyperboloid_points checks MDP constraint", function(assert) {
  var not_on_hyperboloid = [-0.5166377273919696, 0.34753460833346506, 1.0694775378431176];
  var text = array_to_pretty_string([not_on_hyperboloid]);
  assert.throws(function() {
    var pts = parse_hyperboloid_points(text, 3);
  });
});

QUnit.test("parse_edges", function(assert) {
  var text = '[[0,1], [2, 0]]';
  var edges = parse_edges(text, 2);
  assert.deepEqual(edges[0], [0, 1]);
});

QUnit.test("parse_edges checks indices", function(assert) {
  assert.throws(function() {
    var edges = parse_edges('[[-1, 1]]', 3);
  });
  assert.throws(function() {
    var edges = parse_edges('[[1, 4]]', 3);
  });
});
