# QA / SDET Interview Question Bank — Deduplicated & Categorized

Collected from interview experiences (Amazon, Deloitte, PwC, Siemens, Publicis Sapient, ITC Infotech, EY, TCS, Nagarro, Oracle, Barclays, Morgan Stanley, Adobe, EPAM, IBM, Infosys, Cognizant, Capgemini, KPMG, LTIMindtree, Persistent, Zensar, Synechron, Virtusa, Happiest Minds, Coforge, GlobalLogic, Cigniti, Maveric, Google and others).

Rules applied:

- Every question appears **once**. Questions that were reworded across companies are merged into a single entry that keeps every distinct detail.
- Each question lives in exactly one category: **Selenium**, **Java**, **Playwright**, **API**, **QA Basics**.
- Framework, TestNG and Cucumber questions sit under Selenium; SQL, Git, CI/CD, Agile and behavioural questions sit under QA Basics.

---

# 1. Selenium

## 1.1 Basics & WebDriver architecture

1. What is Selenium, and why do we use it?
2. What are the differences between Selenium 3 and Selenium 4, and which Selenium 4 features have improved your framework?
3. What is Selenium WebDriver and its architecture? Is WebDriver an interface or a class?
4. What does `WebDriver driver = new ChromeDriver();` mean, and why do we prefer it over `ChromeDriver driver = new ChromeDriver();`?
5. Can we write `RemoteWebDriver driver = new ChromeDriver();` instead of `WebDriver driver = new ChromeDriver();`? Explain the reason.
6. What is the use of WebDriverManager?
7. What is the role of DesiredCapabilities in Selenium?
8. What are the limitations of Selenium WebDriver?
9. What is the difference between `get()` and `navigate().to()`?
10. What is the difference between `driver.quit()` and `driver.close()`?
11. What are the return types of `getWindowHandles()` and `findElements()`?
12. How do you run Selenium tests in headless mode?
13. What are the different ways to maximize a browser window in Selenium?
14. How do you run Selenium scripts on an already opened browser?
15. How do you launch Internet Explorer in Selenium WebDriver?
16. What is an Invalid Certificate exception, and how do you handle it?
17. What happens if you receive browser notifications during test execution, and how do you deal with them?
18. What is the ideal way to store data using Selenium WebDriver only?
19. Write the complete steps for navigating to Google in Selenium 4.
20. Automate a login (e.g. Google) and verify it succeeded, written the way your framework does it — driver/browser setup, parent classes and POM structure.
21. How would you automate a complete login-to-payment workflow?

## 1.2 Locators & XPath

1. What are the different locators in Selenium? Which one is preferred, which should be avoided, and what is the best approach to locating elements?
2. What is the difference between `findElement()` and `findElements()`, including the exceptions/return values when nothing matches?
3. If an XPath matches two elements on a page, does `findElement()` throw an exception?
4. What is the difference between XPath and CSS selectors, and when do you use XPath over CSS?
5. What are the types of XPath (absolute vs relative), and which one is better?
6. What is the difference between a single slash (`/`) and a double slash (`//`) in XPath?
7. What are XPath axes (parent, child, ancestor, following-sibling, preceding-sibling)? Give examples of where you use them and the functions you use most.
8. When and why do you use `text()` in XPath, and how does it differ from `contains()`?
9. What is the syntax for locating a link (linkText locator / XPath for a link)?
10. Write the syntax to find an element through CSS or XPath (e.g. `//input[@id='submit']`) and an XPath that identifies a unique element on a page.
11. What are relative locators in Selenium 4?
12. What is the difference between `@FindBy` and `driver.findElement()`?
13. How do you handle dynamic elements whose IDs/attributes change on every refresh, and what do you do when dynamic XPaths break after a release?
14. Open any e-commerce website and write the XPath of the search bar.
15. Write the XPath for the Google Search button.
16. Open Airtel.com and write an XPath to retrieve the text of all 11 sliders.
17. Write a dynamic XPath for product ratings on Myntra.
18. Write a dynamic XPath for the "Check Availability" button on Rediffmail.
19. Write an XPath to locate the "Senior Citizen" label on the SpiceJet UI.
20. Two login buttons have the same properties, one in the header and one in the footer. How do you write an XPath for the second one?
21. Write an XPath to locate a specific web-table cell based on the value of a neighbouring cell.
22. How do you write XPaths for elements that disappear (e.g. toast messages, auto-hiding suggestions)?

## 1.3 Waits & synchronization

1. What is the difference between implicit and explicit wait? When do you use each, why choose one when both could work, and what is the explicit-wait syntax?
2. What is Fluent Wait, in which cases is it required, and what is its syntax?
3. How do you use WebDriverWait together with a ThreadLocal driver?
4. How would you wait until the number of browser tabs becomes 4?
5. How do you wait for a file download to complete?
6. A login button becomes enabled only after an API call finishes. How do you handle it?
7. The application loads slowly and causes `TimeoutException` / page-load flakiness. How do you fix it?
8. How do you handle flaky web-table pagination with dynamic polling?

## 1.4 Dropdowns, alerts, frames & windows

1. How do you handle dropdowns? Write the syntax of the `Select` class and explain its methods.
2. How do you select a value from a custom/dynamic dropdown that has no `<select>` tag (i.e. without the Select class)?
3. How do you get all available values from a dropdown, and how do you capture one value to reuse in later verifications?
4. Write a code snippet to handle multiple selections from a dropdown.
5. In a "District Name" dropdown, how would you verify whether the list is sorted?
6. How do you handle JavaScript alerts and confirmation dialogs, and how do you enter text in an alert?
7. A JS alert appears randomly when some button is clicked and you cannot predict when. How do you make sure Selenium accepts it automatically?
8. How do you handle authentication pop-ups in Selenium?
9. How do you handle unexpected pop-ups, modal overlays, cookie-consent banners and pop-ups that appear only on the first visit?
10. How do you handle frames and iframes — switching into nested (including multi-domain) frames, returning to the parent, and the different ways to identify a frame?
11. How do you determine whether an element is inside an iframe?
12. There are three frames (A, B, C). Clicking in Frame C opens a new tab containing login, password and sign-in. Write the Selenium script for this scenario.
13. How do you handle multiple windows/tabs? Write code (with waits) to switch to a child window, perform operations and switch back to the parent.
14. What is the difference between `getWindowHandle()` and `getWindowHandles()`?
15. Why is a `Set` used for window handles?
16. How do you close specifically the second open browser tab?
17. How do you open a new tab in Selenium?
18. How do you manage multi-tab window switching in headless Chrome?

## 1.5 Actions, JavaScriptExecutor & element interactions

1. What is the Actions class? Name a few of its methods, and how does it differ from the Select class?
2. How do you perform mouse actions — hover, right-click and drag-and-drop? Write the code.
3. How do you perform keyboard actions with the Actions class — Ctrl+A, pressing ENTER, and holding SHIFT to type uppercase? Write the syntax.
4. How do you handle drag-and-drop on an HTML canvas?
5. How do you hover over SVG graph elements and capture dynamic tooltips?
6. Print all customer-salary values from a given graph using Selenium.
7. What is the Selenium syntax for copying and pasting an image?
8. What is the purpose of the Robot class in Selenium?
9. What is JavaScriptExecutor? When do you use it, and what can you do with it (scroll, click, set values, fetch text)? Show code.
10. How do you click hidden DOM elements using JavaScriptExecutor?
11. How do you scroll in Selenium — by pixels (e.g. 2000 px), to a specific element, and until the footer is visible?
12. How do you automate infinite-scroll / lazy-loaded tables and assert on rows?
13. What are the different ways to click a button/web element in Selenium?
14. What are the different ways to enter text into a field (`sendKeys()` and alternatives)?
15. `sendKeys()` is not entering text even though the locator and code are correct. What could be the reasons?
16. What is `ElementClickInterceptedException` (element not clickable though the locator is right), and how do you fix it?
17. How do you fetch the text from a text box, and how do you fetch an element's attribute value?
18. Write Selenium code to automate a calendar/date-picker element.
19. How do you interact with dynamic web tables, including ones with sticky headers?
20. A particular text can appear in any cell of a web table. How do you locate it dynamically?
21. A web table has 3 columns and 4 rows. Sort the second column and get the value of the fourth row.
22. How do you locate and handle elements inside a Shadow DOM (open mode), and why do applications use it?
23. What causes `StaleElementReferenceException`, and how do you handle it (e.g. on dynamic React dropdown lists, or after a page refresh)?
24. Which Selenium exceptions have you faced (give five), and how did you resolve them?
25. How do you handle exceptions in Selenium scripts?
26. How do you take screenshots in Selenium — full viewport, full page and a single web element? Write the code.
27. How do you handle file uploads (browse button) — `sendKeys`, AutoIt and Robot class?
28. How do you automate and verify file downloads, including in headless Chrome, and validate the contents of the downloaded file?
29. How do you print all links on a page (and where do you store them), and how do you find broken vs working links? Write the program.
30. How do you capture network logs in Selenium?
31. How do you capture browser console errors during a Selenium run?
32. How do you validate CSS properties such as colour, font and element position?
33. Can CAPTCHA be automated or validated with Selenium? If so, how?
34. How do you validate that Google Analytics or Comscore tags are present on a page?

## 1.6 Framework design & Page Object Model

1. Explain your automation framework in detail — architecture, components, folder structure, tools and core helper utilities.
2. How would you design a scalable automation framework from scratch (e.g. Java + TestNG, 5,000+ tests, no existing framework)? What does an ideal framework look like?
3. Have you built a framework from scratch? What automation challenges did you face while developing and maintaining it, and how did you overcome them?
4. How do you design a hybrid automation framework?
5. What is the purpose of using frameworks in testing, and what are their pros and cons?
6. What is the Page Object Model? Why is it used, how have you implemented it, and what are its advantages, disadvantages and limitations?
7. How do you design page classes / the object repository for locator reusability, and how do you add new fields to it?
8. What is Page Factory? How is it different from POM, why is it used, and how does lazy element initialization work?
9. If your application has 100 pages, do you create 100 page objects? How do you manage them efficiently?
10. How do you design the Page Object Model for single-page applications?
11. How would you create a page object for the Amazon homepage?
12. How do you manage locators through centralized JSON files?
13. How do you manage test data in your framework and pass it to scripts?
14. How do you implement data-driven testing with Excel, CSV or JSON, and how would you design the utility that reads Excel/CSV/DB data (e.g. first row, first cell)?
15. Write code to read the username and password from a `.properties` file.
16. How do you manage environment configuration (QA, UAT, Staging, Prod) — central config files, Maven profiles and build tools?
17. How do you keep test data isolated and configured per environment (QA vs Staging vs Prod)?
18. What is your strategy for writing reusable utilities and keeping scripts maintainable as the project grows?
19. How would you design reusable, thread-safe utilities for parallel execution?
20. Which reporting tool do you use and why? How do you generate Extent/Allure/HTML reports, customise them after execution and embed error logs? Write custom-report code.
21. How do you capture screenshots only for failed tests using TestNG listeners and attach them to the Extent/HTML report?
22. What is Log4j/Log4j2, and why do we use logging in a Selenium framework?
23. What are the log levels in Log4j2?
24. What is the use of appenders in Log4j2?
25. How do you integrate Selenium with other tools (TestNG/JUnit, Maven/Gradle, Jenkins, Allure/Extent, Git)?
26. How do you execute your automation suite, and what changes/pre-requisites do you set up before a run?
27. How often do you trigger regression scripts, and how do you manage them in the repository?
28. Do you follow sprint (in-sprint) automation or regression automation?
29. What factors do you consider when selecting an automation tool for a project?
30. Given TOSCA, LoadRunner and Selenium, which tool would you use for which kind of testing?
31. I give you a website to automate. How do you proceed, and what questions do you ask first?
32. How do you automate a feature that is not yet fully developed?
33. You have been asked to automate a legacy application / convert a legacy manual regression suite. What is your approach?
34. Manual test cases need urgent automation within 2 days. What is your strategy?
35. A script worked yesterday but fails today, or the suite started failing after a deployment. How do you troubleshoot?
36. The application has minor changes that break scripts. How do you approach modifying the automation?
37. A test fails (say at line 98 of 100). What is your next step?
38. How do you reduce bugs in the automation scripts you write?
39. How do you identify and fix memory leaks in automation tests?
40. How do you scale automation as the application and team grow?
41. How do you do code review for test scripts, and what pull-request guidelines would you set for a test repository?
42. How do you define automation ROI metrics and report progress to leadership?
43. How do you verify that a confirmation email was sent after user registration?
44. How do you configure visual comparison checks for dynamic dashboard charts?
45. How do you integrate Axe-core accessibility checks into automation?
46. How would you compare two Excel files with 1 million records each and report the differences efficiently?
47. How did you integrate AWS into your project, and what reporting mechanism did you use?

## 1.7 Parallel execution, Grid & stability

1. What is Selenium Grid, and what are its advantages?
2. How does Selenium Grid work in the latest version (router, distributor, session map, event bus — the async architecture)?
3. How would you design a Selenium Grid for parallel execution, and how do you execute tests on a remote machine?
4. How do you run tests in parallel in Selenium, and what challenges have you faced doing so?
5. How do you make a framework thread-safe for parallel runs — ThreadLocal WebDriver initialization, no data leakage — and how would you fix a framework that is not thread-safe?
6. What is your strategy for maintaining a framework for parallel execution across both Selenium and Playwright?
7. How do you run cross-browser tests in parallel across Chrome, Edge and Firefox, including on cloud grids?
8. You have 100 test cases. How would you execute 20 in each browser?
9. How do you avoid test-data conflicts when thousands of tests run in parallel?
10. What is your strategy for cleaning up test data created during parallel execution, including residual DB records after an unexpected crash?
11. How would you cut suite execution time (e.g. 5,000 tests from 6 hours to under 1 hour, or 10 hours to 8)?
12. How do you identify, root-cause and fix flaky tests, in Selenium and in high-frequency CI pipelines?
13. How do you tell whether a failure is a genuine product defect or a flaky/script issue, and how do you classify them in triage?
14. A critical test fails in 1 out of every 100 executions. How do you find the root cause?
15. How do you implement retry logic without hiding genuine failures or significantly increasing build time?

## 1.8 TestNG

1. What is TestNG, and how is it different from JUnit?
2. How do you install TestNG in a Maven project and integrate Selenium with it?
3. What annotations does TestNG provide, and what is their hierarchy/execution order?
4. What is the difference between `@BeforeTest`, `@BeforeClass` and `@BeforeMethod`?
5. Why do we need `@BeforeSuite` and `@AfterSuite`?
6. What is the execution format/flow of tests in TestNG?
7. What is priority in TestNG? What is the default, can it be zero or negative, and what happens when no priority or the same priority is set?
8. What attributes can be used with `@Test`?
9. What is `dependsOnMethods`, and how does it differ from `dependsOnGroups`?
10. What are groups in TestNG, and how do you run only regression tests — including from the Maven CLI?
11. What are the different ways to run specific test cases in TestNG?
12. What are the different ways to exclude/ignore tests, and how do you skip a test based on a condition?
13. How do you run a test method or class repeatedly (e.g. 100 times)?
14. What does `threadPoolSize` mean in TestNG, and how does it work?
15. How do you parameterize a test using `@Parameters`?
16. What is a DataProvider? How do you create and use one, and how do you design DataProviders for scalable test data?
17. How do you feed external JSON test data into a TestNG DataProvider?
18. How do you pass dynamic command-line arguments to TestNG XML runners?
19. What is the `@Factory` annotation?
20. What are TestNG listeners, which ones have you used, and how do you implement them?
21. Write the method of the `IAnnotationTransformer` interface.
22. How do you rerun only failed test cases (e.g. 20 out of 100), including within the same execution? Write an `IRetryAnalyzer` implementation.
23. What types of assertions are used with Selenium, and what is the difference between Assert and Verify (hard vs soft assertions)?
24. How do you configure safe parallel execution in TestNG at method, class and suite level?
25. How do groups, listeners, retry logic and dependencies work together in TestNG?

## 1.9 Cucumber BDD

1. Explain the Cucumber framework, its structure and the essential files it needs.
2. What is Gherkin, and what are the key Cucumber keywords?
3. How do feature files, step definitions, hooks and tags work together?
4. What is the difference between Background, Scenario and Scenario Outline?
5. Can we have two Scenario Outlines in a single feature file?
6. How do you read tabular data in Cucumber without a Scenario Outline (DataTable)?
7. What are tags in Cucumber, and how do you execute scenarios using them?
8. What is inside the Runner file, and what options does `@CucumberOptions` provide?
9. What are conditional (tagged) hooks vs directional (Before/After) hooks?
10. How do you make a piece of code run only before the first scenario of a feature file, and how do you set up pre/post activities across all scenarios?
11. How do you share dynamic scenario state across step definitions?
12. How do you run Cucumber scenarios in parallel, and how do you use Scenario Outline effectively with it?
13. How do you run one scenario multiple times?
14. How do you integrate Cucumber with Selenium and TestNG?
15. Why do you prefer Cucumber BDD in your project?
16. What are the key differences between the Cucumber framework and TestNG?
17. How do you pass the browser name from a Jenkinsfile to a Cucumber step definition?

---

# 2. Java

## 2.1 Core Java

1. Explain the concept of compilation in Java (compiler, bytecode, JVM).
2. What are the data types in Java?
3. What is type casting? Give examples.
4. What is the difference between `for` and `while` loops?
5. What is the `static` keyword? Explain its use cases and static vs instance members.
6. What is the `final` keyword, and is it valid to declare `public static final` variables?
7. What is the difference between `final`, `finally` and `finalize`?
8. Explain the `this` and `super` keywords. What does `super()` do?
9. What is a constructor? How does it differ from a method, and where are constructors used in your Selenium framework?
10. Can a constructor be static, private (and for which use cases), overridden or inherited?
11. How do you invoke constructors from the same class and from other classes?
12. What is the difference between constructor overloading and method overloading?
13. What is the difference between the `private`, `public` and `protected` access modifiers, and when is `protected` useful?
14. What is the difference between a pointer and a reference?
15. How does memory management and garbage collection work in Java?
16. What happens internally when `System.out.println()` is executed?
17. Write a program that accepts input at runtime and displays the output.
18. Why is String immutable in Java?
19. What is the difference between String, StringBuffer and StringBuilder?
20. How many String objects are created by `String s1 = new String("JAVA");`?
21. What is the difference between `==` and `.equals()` for strings?
22. How do you implement `hashCode()` and `equals()`?
23. How do you use regular expressions for pattern matching in Java?

## 2.2 OOP & design patterns

1. Explain the OOP concepts and where you have applied each in your automation framework.
2. How have you implemented abstraction and encapsulation in your project?
3. What is polymorphism? Explain compile-time vs run-time polymorphism (static vs dynamic binding) with implementation.
4. What are method overloading and method overriding? Show code and where you used them in Selenium.
5. Can static methods be overloaded or overridden? Can final methods be overridden?
6. A child class extends a parent and both define the same method. With a parent reference holding a child object, which method is called — and what happens with constructors?
7. Where have you used inheritance in your framework?
8. What is the difference between a class and an object?
9. What are abstract classes and abstract methods? Can an abstract class contain implemented methods?
10. Why is an abstract class allowed to have a constructor?
11. What is the difference between an abstract class and an interface?
12. What is an interface, what is its purpose, and how have you implemented interfaces in your framework?
13. Can you create an object of an interface?
14. Why can't we write the class logic in the interface instead of the implementing class?
15. How do you achieve multiple inheritance using interfaces? Write a code example.
16. Given two interfaces, one with 4 methods and another with 2, how can you selectively implement only a few methods?
17. How do you call a method of an interface that has not been implemented?
18. What is a functional interface? Which functional interfaces do streams use with lambda expressions?
19. Implement the OOP concepts (encapsulation, inheritance, polymorphism, abstraction) for a Savings Bank system.
20. What is the Singleton design pattern and its use cases? Write a thread-safe Singleton class.
21. What is the Factory design pattern?

## 2.3 Exception handling

1. Explain exception handling in Java.
2. Explain the complete exception hierarchy. What is the parent class of all exceptions?
3. What is the difference between an exception and an error?
4. What is the difference between checked and unchecked exceptions? Give examples of checked exceptions.
5. What is the difference between `throw` and `throws`?
6. Can we use `try` without `catch`? `try` with `finally`? Multiple `catch` blocks with one `try`?
7. What is the `finally` block?
8. How do you create and throw a custom exception?
9. How do you handle `NullPointerException`?
10. You hit a `ConcurrentModificationException` in a test. How do you fix it?
11. What is the difference between fail-fast and fail-safe iterators?

## 2.4 Collections

1. Explain the Java Collections framework and its hierarchy. Which collections have you used in your framework?
2. What is the difference between `Collection` and `Collections`?
3. What is the difference between List, Set and Map?
4. What is the difference between an array and an ArrayList, and how do you convert between arrays and lists?
5. What is the difference between ArrayList and LinkedList, and where can LinkedList concepts be used in test automation?
6. What is the difference between ArrayList and LinkedHashSet?
7. How does HashMap work internally? What happens when two keys have the same hash?
8. What is the difference between HashMap and HashSet?
9. What is the difference between HashMap and Hashtable, and between Hashtable and HashSet?
10. What is the difference between HashMap and ConcurrentHashMap, and where would you use each in an automation framework?
11. What is LinkedHashMap and its use? How do HashMap, LinkedHashMap and TreeMap differ?
12. Does Map support null keys and null values?
13. What are the different ways to iterate over a Map?
14. What is the difference between Comparable and Comparator? Write code for both.
15. Which data structure would you use to remove duplicates from a large dataset before validating an API response?

## 2.5 Java 8+, Streams & multithreading

1. Which Java 8–21 features have you used in automation frameworks?
2. What are Streams and lambda expressions, and where have they (and better exception handling) improved your framework code?
3. What does the double colon `::` (method reference) mean?
4. Find duplicate elements in a list using Java Streams.
5. Filter out empty or null strings from a list using Java 8 streams.
6. Given an array of car names, capitalize every name longer than 3 characters using streams.
7. What is multithreading? Why is it used, and what are its real-world advantages?
8. How have you handled multithreading in parallel test execution?
9. Implement serialization and deserialization in Java.

## 2.6 Coding — strings

1. Reverse a string without using built-in methods.
2. Reverse a string while preserving the position of whitespace.
3. Reverse each word of a sentence in place ("This is a test." → "sihT si a .tset").
4. Reverse the word order of "Happiest Minds 2026" without changing punctuation.
5. Take "This is a Java Program", remove the spaces, print it, then reverse it.
6. For `str = "Automation Test Engineer"`, remove the spaces and print each character with its index.
7. Check whether a string is a palindrome.
8. Find the first non-repeating character in a string ("swiss" → 'w').
9. Find the last non-repeating character in a string.
10. Find/print the duplicate characters in a string.
11. Remove duplicate characters from a string.
12. Count the occurrences of each character in a string ("success" → s:3, u:1, c:2, e:1).
13. Find the most frequent and least frequent characters in a string.
14. Find the second most repeating character in a string.
15. Count word frequency / print duplicate words with counts ("cat dog cat" → cat:2, dog:1).
16. Count the words and characters in a string.
17. Count vowels and consonants in a string.
18. Remove all vowels from a string ("automation" → "tmtn").
19. Move vowels to the left, consonants to the middle and special characters to the right.
20. Remove special characters from a string, keeping only alphabets.
21. Find all possible substrings of a string (e.g. "abcd").
22. Find the longest substring without repeating characters.
23. Count/find the palindromic substrings of a string.
24. Print all permutations of a string.
25. Check whether two strings are anagrams.
26. Check whether one string is a rotation of another ("ABCD", "CDAB" → true).
27. Find the middle character(s) of a string.
28. Transform "tomorrow" into "t3m3223w".
29. Replace every odd-position character of `str = "Dear Candidate please join the call"` with the vowels taken in sequence from `a = {"abc123","def456","ijk789","mno246","uvw135"}`.
30. Swap two string variables without using a third variable (s1="QA", s2="Dev").
31. Validate usernames: alphanumeric only, no spaces or special characters, no duplicates.
32. Generate a random, unique email/username for every test run.
33. For the string "87530", report whether each digit is even or odd.

## 2.7 Coding — numbers & logic

1. Check whether a number is even or odd.
2. Check whether a number is prime, and print all primes up to N.
3. Print the Fibonacci series up to N.
4. Calculate the factorial of a number.
5. Reverse a number.
6. Print every digit of 12345 twice (1122334455), and a variant that doubles only the even digits.
7. Check whether a number is an Armstrong number.
8. Check whether a number is a palindrome (121 → true, 123 → false).
9. Find the sum of the digits of a number (123 → 6).
10. Swap two numbers without using a third variable.
11. Find the maximum binary gap of 529.
12. Generate the sequence 100, 10, 90, 20, 80, 30 from the inputs 100 and 10.
13. Given 3 stairs, find the number of ways to reach the top from ground level.
14. Write code for a basic mobile calculator.
15. Three students, two rooms, three papers (Physics 3 h, Chemistry 2 h, Maths 1 h), one student per room at a time. What is the least total time, and how many loops and variables would a program need?
16. Puzzle: a boy and a doctor are fishing; the boy is the doctor's son but the doctor is not the boy's father. Who is the doctor?

## 2.8 Coding — arrays & data structures

1. Calculate the sum of all elements in an array.
2. Find the maximum and minimum values in an array without built-in methods.
3. Find the second largest and second smallest elements in an array without sorting.
4. Find the Kth largest and Kth smallest elements in an array.
5. Reverse an array without using an additional array.
6. Count the even and odd numbers in an array.
7. Search for an element and return its index (linear search), showing a message if it is not found; predict the output for `{10,20,30,50,70,90}`, key 50.
8. Given `{1,3,3,4,5,6,6,7,8,9,9}`, print all indices of a searched element.
9. Find the first and last occurrence of an element in a sorted array.
10. Count the frequency of each element in an array.
11. Find the top K frequent elements in an array.
12. Rotate an array to the right by K positions.
13. Check whether an array is a palindrome.
14. Merge two arrays into one.
15. Remove duplicates from an array (without HashMap) and from an ArrayList.
16. Find the duplicate elements in an array (including a String array) without an additional data structure.
17. Find the common elements between two arrays.
18. Sort an array without built-in methods / implement a custom sorting algorithm.
19. Sort an array of 0s, 1s and 2s in O(n) time.
20. Find the missing numbers in an array.
21. Find the non-repeated elements in an array.
22. Given `{6, 8, 11, 6, 7, 18}` and a target of 17, find the indices of two elements that sum to the target.
23. Find the maximum-sum subarray.
24. Shift all even numbers to the left and odd numbers to the right in `{2,5,8,7,1,3,6,4,5,9}`, then optimize.
25. Given `present = [5,4,6,2,3]`, `future = [8,5,4,3,5]` and a budget of 10, find the maximum profit.
26. Sort a HashMap by keys when one of the keys is null.
27. Reverse a linked list.
28. Detect a cycle in a linked list.

## 2.9 Other languages

1. Explain and implement decorators in Python.
2. What JavaScript basics should an automation engineer know (asked as a quick-fire round)?

---

# 3. Playwright

## 3.1 Architecture & framework

1. What is Playwright? Explain its architecture and execution model.
2. Explain your Playwright framework architecture and how you would design it to scale.
3. Selenium vs Playwright — what are the key differences, why did you choose Playwright, and when would you pick one over the other?
4. How do TypeScript types improve automation framework reliability?
5. How would you design reusable Playwright fixtures?
6. When and why would you use isolated browser contexts, and how do they compare with Selenium sessions?
7. How do you bypass login screens using saved browser storage state?
8. How do you run Playwright tests in parallel safely?
9. How do you structure API tests using Playwright?

## 3.2 Locators, waits & interactions

1. Which locator strategies do you use in Playwright, and how do you design stable/dynamic locators for dynamic UIs?
2. What is the difference between `locator()`, `getByRole()` and `getByText()`?
3. What is Playwright auto-waiting, how does it compare with Selenium explicit waits, and when are explicit waits still justified?
4. Write a Playwright script to log in to an application.
5. Amazon scenario: search for "iPhone 16 Pro 256GB", build a dynamic locator for the product and fetch its price.
6. How do you handle file upload and download in Playwright?
7. How do you handle multiple tabs in Playwright?
8. How do you handle shadow-root elements in Playwright compared with Selenium?
9. How do you capture element-specific vs viewport screenshots in Playwright?

## 3.3 Network, mocking & debugging

1. How do you intercept and modify network requests and responses in Playwright?
2. How do you mock error responses (403/404) with Playwright route handlers?
3. How do you block image and font requests in Playwright?
4. How do you configure network throttling (e.g. Slow 3G) in Playwright?
5. How do you record videos and trace logs, and use Trace Viewer to debug failures?
6. How do you diagnose flaky tests using screenshots, videos and traces?
7. How do you attach Playwright trace artifacts to test reports on CI failure?
8. How do you generate Allure or HTML reports in Playwright?

## 3.4 CI & TypeScript

1. How do you integrate Playwright with Jenkins?
2. How do you integrate Playwright with Azure DevOps?
3. 400+ tests pass locally, but the scheduled execution in Azure DevOps is not running. How do you investigate?
4. Write a TypeScript function to remove duplicate values from an array.

---

# 4. API

## 4.1 Fundamentals

1. What is an API?
2. What is a web service, why is it important, and how do web services differ from APIs?
3. What is REST (full form), and why is it widely used?
4. What are REST, SOAP and GraphQL, and how do SOAP and REST differ in design?
5. What is WSDL, and what role does it play?
6. How is XML different from HTML?
7. What is a schema in web technologies?
8. What is an endpoint?
9. What is a payload?
10. What is the difference between a URI and a URL?
11. What is 3-tier architecture?
12. What is server-side validation?
13. What are the components of an HTTP request?
14. What is an HTTP response?
15. Explain the HTTP methods GET, POST, PUT, PATCH and DELETE and their differences (GET vs POST, POST vs PUT, PUT vs PATCH), including the essential components of GET and POST.
16. What is the purpose of the TRACE method?
17. If a GET request takes one minute to respond, can another HTTP method (e.g. HEAD) validate it faster?
18. What is the difference between query parameters and path parameters? Give the query-parameter syntax.
19. Explain the common HTTP status-code families and what 400, 404 and 501 mean.
20. What is the difference between 200, 201 and 204?
21. What is the difference between 401 (Unauthorized) and 403 (Forbidden)?
22. What is the difference between 500, 502 and 503, and when does 502 occur?
23. Which status codes do you use for negative scenarios?
24. What is the difference between authentication and authorization?
25. Which authentication types have you used (Basic, Bearer, OAuth)?
26. What is the difference between OAuth 1.0 and OAuth 2.0, and what content type does the OAuth 2.0 token request use?
27. What is the difference between API testing and unit testing?

## 4.2 Test strategy & validation

1. What tests/validations do you perform on a REST API (including a standalone API)?
2. What do you test in third-party integrated APIs?
3. What is your end-to-end approach to API testing and automation, especially when there is no UI?
4. How do you decide which scenarios to automate through the UI and which through the API?
5. How do you test "Add to Cart" through both UI and API?
6. How do you validate status code, headers, cookies, content-type and response body?
7. How do you validate complex, deeply nested JSON responses (JSONPath, dynamic array-length assertions, in Java)?
8. How do you validate a response against a JSON schema, including a dynamic schema file?
9. How do you verify that the data returned by an API is actually correct — e.g. it returns HTTP 200 but the business data is wrong — and how do you report it?
10. How do you perform positive and negative API testing, and how do you assert 400 Bad Request and 500 Server Error responses?
11. How do you test an API when a new field is added to the response?
12. The API has no documentation yet. How do you test it?
13. How do you test API idempotency?
14. A payment is processed twice when the user double-clicks Pay. How do you test it and prevent duplicate transactions?
15. How do you test an API when a downstream service is unavailable, including timeouts and retries?
16. How do you test API rate limiting, and how do you manage 429 Too Many Requests in your own test runs?
17. A POST request returns 500 Internal Server Error. How do you tell whether it is a test issue or a server issue?
18. How do you debug failing APIs across logs, payloads and environments, and what common errors do you see?
19. How do you handle a delayed API response in tests?
20. The API returns partial data and the UI is stuck. How do you test this?
21. What is your metric for validating API performance?
22. The backend changed an API without telling QA. How do you make sure that does not happen again?
23. How would you design an end-to-end test framework for a microservice processing thousands of messages per second, covering correctness and performance at scale?
24. How do you validate real-time WebSocket event frames in automation?

## 4.3 Automation with REST Assured

1. Have you worked with REST Assured or Postman for API automation? Describe your experience testing REST services.
2. How would you design a reusable API automation framework (REST Assured or Playwright) that scales to hundreds of endpoints?
3. How are API tests integrated into your UI automation framework?
4. How would you build REST API automation for CRUD workflows?
5. Write a basic REST Assured script for GET/POST calls with status and body assertions.
6. What are RequestSpecification and ResponseSpecification, and how do they differ? Write code.
7. What is dependency injection in REST Assured, and how does it enhance API testing?
8. How do you serialize objects to JSON and deserialize nested JSON responses into POJOs (e.g. with Jackson)? Write the request/response logic.
9. What is API chaining, and how do you pass a value from one response into the next request?
10. How do you extract an auth/JWT token from a login response (body or headers) and pass it as a dynamic Bearer token to downstream calls?
11. How do you handle OAuth/Bearer tokens that expire mid-run (e.g. every 10 minutes) with automatic refresh?
12. How do you change the JSON payload and add authentication to an API request?
13. How do you handle SSL certificates in API automation?
14. How do you send multipart file-upload requests in REST Assured?
15. The UI is not ready and you must test file upload. What API checks should be in place?
16. How do you automate GraphQL API requests and validate fields?

## 4.4 Mocking

1. How can you mock a payment API when the endpoints are the same?
2. How do you introduce a delay in mocks?
3. Can you mock events? If yes, how?

## 4.5 Postman & SoapUI

1. When do you use collections, environment variables and global variables in Postman?
2. How do you execute a Postman collection end to end?
3. How do you add validation points in Postman, such as checking the status code?
4. What happens when a response returns form data instead of JSON, and how do you validate it?
5. How do you set up Basic Auth in Postman?
6. Where do you store environment credentials?
7. How do you save a demo (example) response for a request?
8. How do you validate an API request that only works over VPN?
9. How do you filter results in an API request using Postman?
10. How do you set up custom headers in Postman?
11. How do you delete a variable after test execution finishes in Postman?
12. Why do we use SoapUI for testing?
13. Which assertions are commonly used in SoapUI?

---

# 5. QA Basics

## 5.1 Testing fundamentals

1. What is the difference between verification and validation?
2. Explain the SDLC and its phases. What happens in the maintenance phase?
3. What is the STLC, and what are its phases?
4. What is the difference between the Agile and Waterfall models?
5. What are the different types of software testing, and which have you performed?
6. What are black-box, white-box and grey-box testing?
7. What are the types of black-box testing?
8. What is functional testing, and how does it differ from non-functional testing? Give examples.
9. What is system testing?
10. What is integration testing? Give an example and explain how you verify it in your project.
11. Is unit testing done by the developer or the tester?
12. What is the difference between smoke, sanity and regression testing?
13. What is the difference between retesting and regression testing?
14. When a build arrives, which do you perform first — smoke, sanity, regression or retesting?
15. What is the difference between alpha and beta testing?
16. What is utility testing, and is it considered functional testing?
17. How do you approach exploratory testing? Give an example where it found a defect.
18. How do you perform browser-compatibility testing, and what non-functional testing is required?
19. What is the difference between a defect (bug), an error and a failure?
20. What is the test pyramid?
21. What are test metrics, and how do they relate to TDD and test management?
22. What is risk-based testing, and how do you perform it?
23. Explain root-cause-analysis techniques.
24. What are the do's and don'ts for a tester?

## 5.2 Test design & documentation

1. What is the difference between a test scenario and a test case?
2. What points (give five) do you consider when writing a good test case?
3. What is test design? Explain the test design techniques you use to create efficient test cases.
4. What is your process for creating test cases for a new feature and updating them during development?
5. What is a test plan, and what does it include?
6. What is the difference between a test plan and a test strategy?
7. What is a traceability matrix, and how is it used?
8. How do you ensure a requirement is fully testable?
9. How do you ensure complete coverage, including all edge cases and negative scenarios for a form?
10. How do you decide test coverage when time is limited?
11. How do you decide when to stop testing a feature?
12. Where do you write and manage test cases (Excel or a tool), and how do you keep documentation in order?
13. What is the X-ray tool, and how is it used?
14. Which test-management and bug-tracking tools do you use?

## 5.3 Defect management

1. Explain the bug/defect life cycle with a real example. What does the "Deferred" status mean, and how do you manage defects at an early stage?
2. What is the difference between severity and priority? Who decides each, can they change, and give examples such as high priority/low severity and high severity/low priority.
3. What is the difference between a Blocker and a Critical bug?
4. What should a good bug report contain, and what steps do you follow to log a defect in Jira?
5. What is bug/defect leakage, how do you calculate it, and how do you handle it?
6. You find three related bugs. Do you report them separately or combine them?
7. A developer rejects your bug as "not a bug / works as designed". How do you justify it?
8. Developers mark a bug "Not Reproducible" (or "works on my machine") but you can reproduce it. What do you check and do?
9. You cannot reproduce a bug consistently (it appears 1 in 10 times). Do you log it, and how?
10. A developer is not fixing a bug. How do you approach the situation?
11. You disagree with a developer (or the team) about a bug's severity/priority. How do you handle it?
12. A bug exists in Prod but is not reproducible in QA. How do you investigate?
13. You found a bug that also exists in a lower environment. What do you do?

## 5.4 Automation strategy & regression

1. How do you decide which test cases to automate and which to keep manual?
2. Which test cases would you not automate, which features cannot be automated, and is 100% automation possible?
3. What are the benefits of automation testing over manual testing?
4. If a scenario takes a long time to execute, would you prefer manual or automation testing, and why?
5. Do you prefer manual or automation testing, and which is better for the team?
6. How do you pick test cases for regression testing?
7. How do you perform regression manually and make sure no critical functionality is missed?
8. How do you prioritize test cases — for a large product, and when you have 100 cases with only 3 hours left?
9. How many test cases have you automated in a single sprint?
10. How do you stop test coverage from rotting as the product evolves?
11. You inherited a test suite you did not build. What do you do first?

## 5.5 Test scenarios & "how would you test…"

1. Write test cases for a login page, including negative cases.
2. How would you conclude that a login page is user-friendly?
3. How do you test a login system that supports MFA/OTP, including when the SMS service is unstable?
4. Login sometimes succeeds and sometimes fails with the same credentials. How do you debug it and rule out a script issue?
5. How do you test a login that takes too long but still logs in?
6. Write test cases for a payment gateway, and explain how you test the payment flow end to end — including when no real card is available.
7. Write scenarios for search and filter.
8. Write a test case for the scenario where Amazon's search button was not working and you raised an issue.
9. Give five negative test cases for "Add to Cart".
10. Give three negative scenarios for the HTTP protocol.
11. Write test cases for a simple app such as Notepad.
12. Write test scenarios for a permanent marker.
13. Write exhaustive test cases for a mobile app installation.
14. How will you test a calculator app when the requirements are missing?
15. How would you test Google Search?
16. Design a complete test strategy for Gmail.
17. How would you test Google Docs real-time collaboration — what happens when multiple users edit the same document simultaneously?
18. How would you test upload functionality for large files (e.g. 100 MB)?
19. How would you test an AI chatbot such as Gemini or ChatGPT?
20. How do you test the data accuracy of reports and dashboards?
21. How do you test data pipelines or a data migration?
22. The search feature gives different results each time. How do you validate it?
23. You need to test 10K records but the system loads only 2K. What do you do?
24. Login works on Chrome but fails on Safari. What do you check?
25. UI alignment breaks only at certain screen resolutions. How do you test and debug it?
26. Functionality works on your system but fails on another tester's system. What do you do?
27. The system is slow but there are no exact steps to reproduce. What is your approach?
28. A bug occurs only during peak traffic. How do you capture it?
29. You need to verify logs but have no log access. What is your approach?
30. Emails are not received on the test account. How do you verify email functionality?
31. The login API is down. How do you test the rest of the application?
32. Two modules are dependent and one is not ready. How do you test?
33. You do not have enough acceptance criteria for a third-party integration. What do you do?

## 5.6 Requirements, releases & real-world situations

1. Requirements are unclear, incomplete or undocumented (or the BA is unavailable). How do you design tests and proceed, including starting automation?
2. You discover missing requirements during testing. What steps do you take?
3. The expected result in the requirement is itself wrong. What do you do?
4. Requirements or scope change mid-sprint or at the last minute. How do you handle it and your existing test cases?
5. How do you handle change requests in your application?
6. You hit a blocker on the very first test case. How do you proceed?
7. A new build is released but smoke testing itself fails. What action do you take?
8. You find a critical/high-severity bug shortly before release and the client wants to ship today. What do you do?
9. A critical defect is found in production. How do you handle it and investigate the RCA?
10. You missed a test case and the bug leaked to production. What next?
11. The business asks for early sign-off but testing is incomplete. What do you do?
12. A developer pushes code on the last day of the sprint. How do you handle it?
13. A developer calls it a "minor change". How do you evaluate that?
14. Two days before release, all 120 tests pass. What else do you check?
15. A new feature has no spec and ships Friday. How do you test it?
16. You must run 100 test cases in 4 hours and also fix the errors. How do you manage?
17. How do you ensure quality when timelines are tight or resources are limited?
18. How do you manage testing tasks across multiple projects with tight deadlines?
19. What strategies do you use for an application with frequent updates or releases?
20. What do you do on production/release day?
21. What happens to the project if you are on leave?
22. Design a test strategy from scratch for a new product where no QA exists yet.

## 5.7 Agile & process

1. Have you worked in Agile? Explain the methodology, your role and how long your sprints are.
2. Which Agile ceremonies do you follow (stand-ups, sprint planning, sprint review, retrospective), and how do sprint review and sprint planning differ?
3. What is the role of the Scrum Master (and Product Owner)?
4. What are an Epic and a User Story?
5. What is the Definition of Done (DoD)?
6. What is velocity in Agile, and how is it calculated?
7. What estimation techniques do you use, and what is your approach to task estimation?
8. Which metrics do you use to track project progress in Agile?

## 5.8 Metrics, quality gates & leadership

1. Which KPIs, automation and quality metrics do you monitor, and why?
2. Your suite has a 98% pass rate but critical bugs still reach production. What could be missing?
3. How would you design an effective quality gate for production deployment?
4. How do you maintain test-execution dashboards?
5. How do you process test-execution data?
6. We ship three times a day. Where does QA live in that cycle?
7. A flaky test let a bug reach production. Who owns that?
8. Can you explain the services involved in the product you test?
9. How do you handle compliance-bound test data management and data privacy?
10. An automation tester on your team refuses to do manual testing. How do you handle it?
11. Would you be comfortable doing manual testing, or writing unit-level tests in a programming language alongside developers, if the project needs it?
12. How do you collaborate with your team, and can you work as an individual contributor?
13. What is the "message house" technique?

## 5.9 SQL & database testing

1. Write a query for the Nth highest salary (2nd and 3rd, with employee name), with and without LIMIT/TOP.
2. Write a query to find duplicate records, including duplicates across multiple columns.
3. Write a query to find employees who have never placed an order.
4. Explain SQL joins and their types, inner vs outer join, and a real project use case; write a JOIN across two given tables.
5. What is the use of GROUP BY? Write a query to count employees per department.
6. Write a query for the maximum salary in each department.
7. Write a query to retrieve the details of the employee with the highest salary.
8. Write a query for employees who joined in the last 30 days.
9. Write a query to select even roll numbers from a student table.
10. Write a query to select all unique names from a student table.
11. What is the difference between DDL and DML?
12. What are subqueries used for?
13. How many unique/primary keys can a table have, and how do primary and foreign keys relate?
14. Explain a complex SQL query you wrote in your project, and other queries you run day to day.
15. What are database validation concepts?
16. How do you validate UI data against database values, e.g. records after a UI checkout?
17. How do you validate data consistently across API → application → database?
18. The database shows one value, the API returns another and the UI displays a third. How do you find the source of the issue?
19. After clicking Submit, the data is not updated in the database. How do you troubleshoot the root cause?
20. A critical API returns a valid response but the UI shows blank screens for some users. How do you trace it across API, data and UI layers?
21. How do you connect to a database with JDBC, run queries and assert row counts? Write the connection code.
22. Write code to connect to MongoDB and extract an object.
23. How do you seed database preconditions before API suites and clean up test records afterwards?
24. How would you perform backend testing without running queries?

## 5.10 Git & version control

1. What are the stages of committing code, and the steps/commands to commit and push (`git add`, `git commit`, `git diff`, `git push`, `git pull`)?
2. Is `git push origin feature-branch` correct? Why?
3. What is the difference between `git fetch`, `git pull` and `git clone`?
4. What is the difference between `git merge` and `git rebase`, and when do you use rebase?
5. How do you resolve merge/rebase conflicts during an active sprint?
6. What does `git stash` do, and how do you apply stashed changes back?
7. What is the use case of `git cherry-pick`?
8. What Git branching strategies do you know, and which workflow do you follow?
9. Is it possible to revert changes in a remote repository? How?
10. Why do we need a `.gitignore` file, and how do you add files to it?
11. When do you commit your code, and how do you confirm everyone has the updated code?
12. When you join a new project, which Git commands do you use from start to finish?

## 5.11 CI/CD & build tools

1. Explain your CI/CD execution flow — what happens end to end when a Jenkins build is triggered and runs your automated tests?
2. How do you integrate and run your test suite in Jenkins or GitHub Actions?
3. What is the difference between Jenkins freestyle jobs and pipeline scripts? Can you create a pipeline from a script?
4. How do you create a parameterized pipeline job and pass environment parameters into a build?
5. What is the purpose of a CRON expression in Jenkins?
6. What is the difference between Continuous Integration, Continuous Delivery and Continuous Deployment?
7. How do you set up GitLab CI build triggers on code push?
8. How do you connect your tests to Azure DevOps and configure pipeline triggers for pull requests?
9. How do you handle failed tests in a pipeline?
10. Tests pass locally but fail (sometimes randomly) in CI — Jenkins, a Docker node or GitHub Actions. How do you investigate and debug?
11. How do you run browser tests headlessly inside Docker containers?
12. Explain the Maven build lifecycle.
13. What is `pom.xml`, why is it used, and how is it different from POM (Page Object Model)?
14. What are DevOps and Site Reliability Engineering?
15. Which Linux commands do you know? Write the command to create a file.

## 5.12 Performance & security testing

1. Why is JMeter used, and how is k6 better?
2. What are threads in JMeter?
3. How would you test an application for security vulnerabilities, and what can you do for security scanning?

## 5.13 AI in testing

1. How have you used AI in your daily automation work?
2. AI generates 80% of our tests. What is your job now?
3. Copilot wrote a test that passes. How do you know it is testing the right thing?
4. Your team wants AI for test maintenance. What is the risk nobody is naming?

## 5.14 Behavioural & HR

1. Introduce yourself — your background, testing journey, roles, responsibilities and day-to-day tasks.
2. Explain your current project, its main components and your contributions.
3. Which domain have you worked in, and which domain terminology (e.g. healthcare) do you know?
4. Tell me about the most challenging project or testing problem you solved, and how you overcame the difficulties.
5. Describe the most interesting or critical bug you found (including in production) and its business impact.
6. Tell me about a time you handled a production issue.
7. How do you handle sprint pressure when tickets pile up right before a release?
8. How do you handle conflicts within the QA/Dev team?
9. What challenges have you faced within your team?
10. What are your strengths and weaknesses?
11. What motivates you in QA as a career?
12. Why should we hire you?
13. Why do you want to join this company?
14. Where do you see yourself in the next 2–3 years?
15. Are you able to relocate, and what are your salary and benefits expectations?