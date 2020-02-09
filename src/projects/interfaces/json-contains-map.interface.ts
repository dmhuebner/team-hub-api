export default interface JsonContainsMap {
  property: string; // foo || foo.bar || foo.bar.stuff.thing
  expectedValue: any;
}
