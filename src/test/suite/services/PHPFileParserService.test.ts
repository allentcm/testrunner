import * as assert from "assert";
import * as sinon from "sinon";
import { dirname } from "path";

import { PHPFileParserService } from "../../../services/PHPFileParserService";
import { SpawnService } from "../../../services/SpawnService";
import { VisualCodeShimMock } from "../VisualCodeShimMock";

suite("PHPFileParser", () => {
  const phpCode =
    '<?php\r\nnamespace MyTestNamespace;\r\n\r\nuse My_Test_Module;\r\n\r\n/**\r\n * This is a test class\r\n */\r\nclass MyCommentedClass {\r\n    // Inline parameter\r\n    private $foo = 1;\r\n\r\n    // Inline comment style\r\n    // for TestMethod 1\r\n    protected function TestMethod1() {\r\n        // Do nothing\r\n        function foo() {\r\n            return "Bing!";\r\n        }\r\n\r\n        return foo();\r\n    }\r\n\r\n    // Make sure we ignore quoted stuff\r\n    protected function TestMethod3() {\r\n        echo "Double quote stuff: \r\n        function bogus1() {}\r\n        ";\r\n        echo "Single quote stuff: \r\n        function bogus2() {}\r\n        ";\r\n    }\r\n}\r\n\r\nclass MyUncommentedClass {\r\n    function TestMethod1() {\r\n        return ;\r\n    }\r\n}\r\n\r\nfunction standaloneTest() {\r\n    return "foo";\r\n}\r\n\r\necho "Begin:" . PHP_EOL;\r\n$test = new MyTestClass();\r\necho $test->TestMethod1();';
  const fakeTokens = [
    [379, "<?php\n", 1],
    [388, "namespace", 2],
    [382, " ", 2],
    [319, "MyTestNamespace", 2],
    ";",
    [382, "\n\n", 2],
    [353, "use", 4],
    [382, " ", 4],
    [319, "My_Test_Module", 4],
    ";",
    [382, "\n\n", 4],
    [378, "/**\n * This is a test class\n */", 6],
    [382, "\n", 8],
    [361, "class", 9],
    [382, " ", 9],
    [319, "MyCommentedClass", 9],
    [382, " ", 9],
    "{",
    [382, "\n    ", 9],
    [377, "// Inline parameter\n", 10],
    [382, "    ", 11],
    [314, "private", 11],
    [382, " ", 11],
    [320, "$foo", 11],
    [382, " ", 11],
    "=",
    [382, " ", 11],
    [317, "1", 11],
    ";",
    [382, "\n\n    ", 11],
    [377, "// Inline comment style\n", 13],
    [382, "    ", 14],
    [377, "// for TestMethod 1\n", 14],
    [382, "    ", 15],
    [315, "protected", 15],
    [382, " ", 15],
    [346, "function", 15],
    [382, " ", 15],
    [319, "TestMethod1", 15],
    "(",
    ")",
    [382, " ", 15],
    "{",
    [382, "\n        ", 15],
    [377, "// Do nothing\n", 16],
    [382, "        ", 17],
    [346, "function", 17],
    [382, " ", 17],
    [319, "foo", 17],
    "(",
    ")",
    [382, " ", 17],
    "{",
    [382, "\n            ", 17],
    [348, "return", 18],
    [382, " ", 18],
    [323, '"Bing!"', 18],
    ";",
    [382, "\n        ", 18],
    "}",
    [382, "\n\n        ", 19],
    [348, "return", 21],
    [382, " ", 21],
    [319, "foo", 21],
    "(",
    ")",
    ";",
    [382, "\n    ", 21],
    "}",
    [382, "\n\n    ", 22],
    [377, "// Make sure we ignore quoted stuff\n", 24],
    [382, "    ", 25],
    [315, "protected", 25],
    [382, " ", 25],
    [346, "function", 25],
    [382, " ", 25],
    [319, "TestMethod3", 25],
    "(",
    ")",
    [382, " ", 25],
    "{",
    [382, "\n        ", 25],
    [328, "echo", 26],
    [382, " ", 26],
    [323, '"Double quote stuff: \n        function bogus1() {}\n        "', 26],
    ";",
    [382, "\n        ", 28],
    [328, "echo", 29],
    [382, " ", 29],
    [323, '"Single quote stuff: \n        function bogus2() {}\n        "', 29],
    ";",
    [382, "\n    ", 31],
    "}",
    [382, "\n", 32],
    "}",
    [382, "\n\n", 33],
    [361, "class", 35],
    [382, " ", 35],
    [319, "MyUncommentedClass", 35],
    [382, " ", 35],
    "{",
    [382, "\n    ", 35],
    [346, "function", 36],
    [382, " ", 36],
    [319, "TestMethod1", 36],
    "(",
    ")",
    [382, " ", 36],
    "{",
    [382, "\n        ", 36],
    [348, "return", 37],
    [382, " ", 37],
    [317, "", 37],
    ";",
    [382, "\n    ", 37],
    "}",
    [382, "\n", 38],
    "}",
    [382, "\n\n", 39],
    [346, "function", 41],
    [382, " ", 41],
    [319, "standaloneTest", 41],
    "(",
    ")",
    [382, " ", 41],
    "{",
    [382, "\n    ", 41],
    [348, "return", 42],
    [382, " ", 42],
    [323, '"foo"', 42],
    ";",
    [382, "\n", 42],
    "}",
    [382, "\n\n", 43],
    [328, "echo", 45],
    [382, " ", 45],
    [323, '"Begin:"', 45],
    [382, " ", 45],
    ".",
    [382, " ", 45],
    [319, "PHP_EOL", 45],
    ";",
    [382, "\n", 45],
    [320, "$test", 46],
    [382, " ", 46],
    "=",
    [382, " ", 46],
    [305, "new", 46],
    [382, " ", 46],
    [319, "MyTestClass", 46],
    "(",
    ")",
    ";",
    [382, "\n", 46],
    [328, "echo", 47],
    [382, " ", 47],
    [320, "$test", 47],
    [366, "->", 47],
    [319, "TestMethod1", 47],
    "(",
    ")",
    ";",
  ];

  let sandbox: sinon.SinonSandbox;

  setup(() => {
    sandbox = sinon.createSandbox();
  });

  teardown(() => {
    sandbox.restore();
  });

  suite("tokenize", () => {
    test("should return array of tokens, not setting PHP extensions if enablePHPExtensions is false", async () => {
      const ui = new VisualCodeShimMock();
      const spawn = new SpawnService(ui);
      const parser = new PHPFileParserService(() => {
        return spawn;
      }, ui);

      sandbox.spy(spawn.setCommand).calledWith("php");
      sandbox
        .spy(spawn.setArguments)
        .calledWith(["-n", dirname("../../../dump.php")]);
      sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
      sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
      const result = await parser.tokenize(phpCode);
      assert.deepEqual(result, fakeTokens);
    });
    test("should return array of tokens, setting extensions on non-Windows as .so if enablePHPExtensions is true", async () => {
      const ui = new VisualCodeShimMock();
      (<any>ui).onWindows = false;
      sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
      const spawn = new SpawnService(ui);
      const parser = new PHPFileParserService(() => {
        return spawn;
      }, ui);

      sandbox.spy(spawn.setCommand).calledWith("php");
      sandbox
        .spy(spawn.setArguments)
        .calledWith([
          "-n",
          "-d",
          "extension=json.so",
          "-d",
          "extension=tokenizer.so",
          dirname("../../../dump.php"),
        ]);
      sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
      sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
      const result = await parser.tokenize(phpCode);
      assert.deepEqual(result, fakeTokens);
    });
    test("should return array of tokens, setting extensions on Windows as .dll if enablePHPExtensions is true", async () => {
      const ui = new VisualCodeShimMock();
      (<any>ui).onWindows = true;
      sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
      const spawn = new SpawnService(ui);
      const parser = new PHPFileParserService(() => {
        return spawn;
      }, ui);
      sandbox.spy(spawn.setCommand).calledWith("php");
      sandbox
        .spy(spawn.setArguments)
        .calledWith([
          "-n",
          "-d",
          "extension=json.dll",
          "-d",
          "extension=tokenizer.dll",
          dirname("../../../dump.php"),
        ]);
      sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
      sandbox.stub(spawn, "run").resolves(JSON.stringify(fakeTokens));
      const result = await parser.tokenize(phpCode);
      assert.deepEqual(result, fakeTokens);
    });
    test("should set enablePHPExtensions true if PHP can't call json_encode, and return normally", async () => {
      const ui = new VisualCodeShimMock();
      const stubGetEnablePHPExtensions = sandbox.stub(
        ui,
        "getEnablePHPExtensions"
      );
      stubGetEnablePHPExtensions.onFirstCall().returns(false);
      stubGetEnablePHPExtensions.onSecondCall().returns(true);
      const spawn = new SpawnService(ui);
      const parser = new PHPFileParserService(() => {
        return spawn;
      }, ui);

      sandbox.spy(spawn.setCommand).calledWith("php");
      sandbox
        .spy(spawn.setArguments)
        .calledWith([
          "-n",
          "-d",
          "extension=json.so",
          "-d",
          "extension=tokenizer.so",
          dirname("../../../dump.php"),
        ]);
      sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);

      const stubRun = sandbox.stub(spawn, "run");
      stubRun
        .onFirstCall()
        .rejects(new Error("undefined function json_encode"));
      stubRun.onSecondCall().resolves(JSON.stringify(fakeTokens));
      const result = await parser.tokenize(phpCode);
      assert.deepEqual(result, fakeTokens);
      // Make sure setEnablePHPExtensions got called
      sandbox.spy(ui, "setEnablePHPExtensions").calledOnceWith(true);
    });
    test("should throw an Error if PHP fails with unexpected fault", async () => {
      const ui = new VisualCodeShimMock();
      sandbox.stub(ui, "getEnablePHPExtensions").returns(true);
      const spawn = new SpawnService(ui);
      const parser = new PHPFileParserService(() => {
        return spawn;
      }, ui);

      sandbox.spy(spawn.setCommand).calledWith("php");
      sandbox
        .spy(spawn.setArguments)
        .calledWith([
          "-n",
          "-d",
          "extension=json.so",
          "-d",
          "extension=tokenizer.so",
          dirname("../../../dump.php"),
        ]);
      sandbox.spy(spawn.setWriteToStdin).calledWith(phpCode);
      sandbox.stub(spawn, "run").rejects(new Error("Nee!"));

      try {
        await parser.tokenize(phpCode);
        assert.fail("Call to PHP should have failed");
      } catch (e: any) {
        assert.equal(e.message, "Nee!");
      }
    });
  });
});
