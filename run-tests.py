#!/usr/bin/env python3

import argparse
import logging
import pdb
import re
from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
    NoSuchWindowException,
)
from selenium.webdriver.common.by import By
import tempfile
import time
import yaml

config_file = "test-config.yml"
job_selector = (".jobs-search-results__list-item, "
                ".jobs-job-board-list__item, "
                ".discovery-templates-entity-item")
title_selector = ".job-card-list__title"
company_selector = (".job-card-container__primary-description, "
                    ".job-card-container__company-name")
location_selector = ".job-card-container__metadata-item"
workplace_selector = ".job-card-container__metadata-item--workplace-type"
private_hide_selector = ".lijfhidebutton"
show_you_fewer = "Got it. We’ll show you fewer"
class_logger = None
url_prefix = None


def parse_args():
    parser = argparse.ArgumentParser(description="Test LinkedIn Jobs Filterer")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--chrome", dest="browser", action="store_const",
                       const="chrome", default="chrome",
                       help="Test in Chrome (Default)")
    group.add_argument("--firefox", dest="browser", nargs='?', action="store",
                       const="firefox", help="Test in Firefox (optionally "
                       "specify path of firefox executable)")
    parser.add_argument("--headless", action="store_true", default=False)
    parser.add_argument("--transient", action="store_true", default=False,
                        help='Use transient user data directory with Chrome '
                        '(Firefox always uses transient directory) instead '
                        'of ".chrome"')
    parser.add_argument("--local-only", action="store_true", default=False,
                        help="Don't run tests that depend on LinkedIn")
    return parser.parse_args()


def main():
    global class_logger, url_prefix
    class_logger = logging.getLogger(__file__)
    class_logger.setLevel(logging.DEBUG)
    handler = logging.FileHandler("classes.log")
    handler.setLevel(logging.DEBUG)
    handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    class_logger.addHandler(handler)

    config = yaml.load(open(config_file), yaml.Loader)
    args = parse_args()
    with tempfile.TemporaryDirectory() as user_data_directory:
        if args.browser == "chrome":
            url_prefix = "chrome-extension"
            if not args.transient:
                user_data_directory = ".chrome"
            options = webdriver.ChromeOptions()
            if args.headless:
                options.add_argument("headless=new")
            # Needs to be big enough to prevent the Messaging banner from
            # obscuring the first listed job even when Messaging is hidden.
            options.add_argument("window-size=1280,1024")
            options.add_argument(f"user-data-dir={user_data_directory}")
            options.add_extension("LinkedInJobsFilterer-test.zip")
            driver = webdriver.Chrome(options=options)
        else:
            url_prefix = "moz-extension"
            options = webdriver.FirefoxOptions()
            if args.browser != "firefox":
                options.binary_location = args.browser
            options.set_preference("xpinstall.signatures.required", False)
            if args.headless:
                options.add_argument("headless")
            options.add_argument("--width=1280")
            options.add_argument("--height=1024")
            driver = webdriver.Firefox(options=options)
            driver.install_addon("LinkedInJobsFilterer-test.xpi")
        try:
            run_tests(config, args, driver)
        finally:
            driver.quit()


def run_tests(config, args, driver):
    # Did the changelog page load on install?
    start = time.time()
    while len(driver.window_handles) == 1 and time.time() - start < 2:
        time.sleep(0.1)

    # Does permission need to be granted?
    time.sleep(1)  # Wait for permissions page to load
    for window in range(2, len(driver.window_handles)):
        driver.switch_to.window(driver.window_handles[window])
        if driver.current_url.endswith("permissions.html"):
            print("Waiting for access to linkedin.com to be granted.")
            start = time.time()
            while time.time() - start < 30:
                try:
                    driver.current_url
                except NoSuchWindowException:
                    break
                time.sleep(0.1)
            else:
                raise TimeoutError("Giving up waiting for access.")

    # Does the changelog page have expected content?
    driver.switch_to.window(driver.window_handles[1])
    assert "change history" in driver.page_source
    match = re.match(r"(?:chrome|moz)-extension://(.*)/changes\.html$",
                     driver.current_url)
    extension_id = match[1]

    # Can we load the help page with expected content?
    driver.get(f"{url_prefix}://{extension_id}/help.html")
    assert "Example workflow" in driver.page_source

    # Can we load the options page with expected content?
    options_page = f"{url_prefix}://{extension_id}/options.html"
    driver.get(options_page)
    driver.find_element(By.ID, "hideJobs")
    options_window_handle = driver.current_window_handle

    hidden = driver.find_element(By.ID, "alt-s").get_attribute("hidden")
    assert (hidden == "true") is (args.browser != "chrome")

    driver.find_element(By.ID, "titles").send_keys("TitleRegexp")
    driver.find_element(By.ID, "companies").send_keys("CompanyRegexp")
    driver.find_element(By.ID, "locations").send_keys("LocationRegexp")
    driver.find_element(By.ID, "jobs").send_keys(
        "Title // Company // Location")
    driver.find_element(By.ID, "save").click()
    wait_for(lambda: "Options saved" in
             driver.find_element(By.ID, "status").get_attribute("innerText"))
    driver.find_element(By.ID, "save").click()
    wait_for(lambda: "No changes" in
             driver.find_element(By.ID, "status").get_attribute("innerText"))
    driver.switch_to.new_window("tab")
    driver.get(options_page)
    wait_for(lambda: driver.find_element(By.ID, "titles").
             get_attribute("value") == "TitleRegexp\n")
    wait_for(lambda: driver.find_element(By.ID, "companies").
             get_attribute("value") == "CompanyRegexp\n")
    wait_for(lambda: driver.find_element(By.ID, "locations").
             get_attribute("value") == "LocationRegexp\n")
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == "Title // Company // Location\n")
    # Note that subsequent tests depend on "jobs" not being empty.
    driver.close()

    # Run JavaScript tests
    driver.switch_to.window(options_window_handle)
    test_load_script = """
        import(chrome.runtime.getURL('tests.js'))
          .then((tests) => { return tests.runTests();})
          .then((result) => { document.testResult = result; });
    """
    driver.execute_script(test_load_script)

    test_result = wait_for(
        lambda: driver.execute_script("return document.testResult"),
        timeout=2
    )

    if test_result != "success":
        print("JavaScript tests failed")
        pdb.set_trace()

    if args.local_only:
        return

    # Log into LinkedIn
    driver.switch_to.new_window("tab")
    linkedin_window_handle = driver.current_window_handle
    driver.get("https://www.linkedin.com/")

    state = None
    while state != "homepage":
        (state, elt) = wait_for(
            lambda: ("login", find_password_field(driver)),
            lambda: ("2fa", driver.find_element(
                By.ID, "input__phone_verification_pin")),
            lambda: ("captcha", driver.find_element(
                By.ID, "captcha-internal")),
            lambda: ("challenge", driver.find_element(
                By.NAME, "challengeType")),
            lambda: ("homepage", driver.find_element(
                By.PARTIAL_LINK_TEXT, "Notifications"))
        )
        if state == "login":
            find_username_field(driver).send_keys(config["linkedin_username"])
            elt.send_keys(config["linkedin_password"])
            find_login_button(driver).click()
        elif state == "2fa":
            mfa_code = input("Enter MFA code: ")
            elt.send_keys(mfa_code)
            driver.find_element(By.ID, "two-step-submit-button").click()
        elif state == "captcha":
            input("Solve CAPTCHA and then hit Enter: ")
        elif state == "challenge":
            input("Complete challenge and then hit Enter: ")

    try:
        test_job_on_page(
            driver, "https://www.linkedin.com/jobs",
            linkedin_window_handle, options_window_handle)
        test_job_on_page(
            driver, "https://www.linkedin.com/jobs/collections/recommended/",
            linkedin_window_handle, options_window_handle)
        test_job_on_page(
            driver, "https://www.linkedin.com/jobs/search/"
            "?keywords=Quality%20Assurance%20Engineer",
            linkedin_window_handle, options_window_handle)
    except ElementClickInterceptedException:
        fn = "/tmp/litest_screenshot.png"
        driver.save_screenshot(fn)
        print(f"Element click intercepted, screenshot saved in {fn}")
        pdb.set_trace()


def find_username_field(driver):
    elts = driver.find_elements(By.ID, "username")
    if elts:
        return elts[0]
    return driver.find_element(By.ID, "session_key")


def find_password_field(driver):
    elts = driver.find_elements(By.ID, "password")
    if elts:
        return elts[0]
    return driver.find_element(By.ID, "session_password")


def find_login_button(driver):
    elts = driver.find_elements(By.XPATH, "//*[@aria-label='Sign in']")
    if elts:
        return elts[0]
    return driver.find_element(By.XPATH,
                               "//*[@data-id='sign-in-form__submit-btn']")


def hide_messaging(driver):
    # If Messaging is showing it can block other buttons.
    state = None
    while state != "hidden":
        (state, elt) = wait_for(
            lambda: ("hidden", driver.find_element(
                By.XPATH, "//*[@id='msg-overlay']//*[@type='chevron-up']")),
            lambda: ("showing", driver.find_element(
                By.XPATH, "//*[@id='msg-overlay']//*[@type='chevron-down']")),
        )
        if state == "showing":
            elt.click()


def test_job_on_page(driver, url,
                     linkedin_window_handle, options_window_handle):
    driver.switch_to.window(options_window_handle)
    orig_job_text = wait_for(lambda: driver.find_element(By.ID, "jobs").
                             get_attribute("value"))

    # Can we find and hide a job?
    driver.switch_to.window(linkedin_window_handle)
    driver.get(url)
    hide_messaging(driver)
    # We need to wait until we see the first job _title_ before we look for
    # the first _job_ because empty jobs show up temporarily on the page and
    # are then replaced by the real ones with contents (like job title).
    titles = log_class(wait_for(lambda: driver.find_elements(
        By.CSS_SELECTOR, title_selector)), is_list=True)

    # Wait for the page to "settle", i.e., wait until two seconds go by with
    # the set of job title elements not changing.
    start = time.time()
    while time.time() - start < 2:
        new_titles = wait_for(lambda: driver.find_elements(
            By.CSS_SELECTOR, title_selector))
        if titles != new_titles:
            titles = new_titles
            start = time.time()

    ordinal, first_job = wait_for(lambda: find_first_active_job(driver))
    job_title = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, title_selector))[0].text
    job_company = log_class(wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, company_selector))[0]).text
    job_location = get_location(first_job)

    hide_button = wait_for(lambda: find_hide_button(driver, first_job))
    hide_button.click()

    # Is the job we just hid now in the options?
    driver.switch_to.window(options_window_handle)
    job_text = f"{job_title} // {job_company} // {job_location}\n"
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == job_text + orig_job_text)

    # Can we find and unhide the same job?
    driver.switch_to.window(linkedin_window_handle)
    time.sleep(1)  # race condition, LinkedIn may not be done rearranging
    first_job = wait_for(lambda: find_job(driver, ordinal))
    unhide_result = wait_for(
        lambda: find_unhide_button(first_job),
        lambda: ("permanent" if show_you_fewer
                 in first_job.get_attribute("innerText") else False))
    if unhide_result != "permanent":
        unhide_result.click()

        # Does the unhidden job get removed from the options page?
        driver.switch_to.window(options_window_handle)
        wait_for(lambda: driver.find_element(By.ID, "jobs").
                 get_attribute("value") == orig_job_text)
    else:
        driver.switch_to.window(options_window_handle)
        orig_job_text = (driver.find_element(By.ID, "jobs").
                         get_attribute("value"))

    # Can we find and click the private hide button?
    driver.switch_to.window(linkedin_window_handle)
    ordinal, first_job = wait_for(lambda: find_first_active_job(driver))
    job_title = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, title_selector))[0].text
    job_company = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, company_selector))[0].text
    job_location = get_location(first_job)
    hide_button = wait_for(lambda: find_private_hide_button(driver, first_job))
    hide_button.click()

    # Is the job hidden now?
    wait_for(lambda: first_job.get_attribute("hidden") == "true")

    # Is the LinkedIn hide button still there, i.e., we didn't do the wrong
    # thing and hide the job via LinkedIn instead of privately?
    wait_for(lambda: find_hide_button(driver, first_job, hidden_ok=True))

    # Is the job we just hid now listed on the options page?
    driver.switch_to.window(options_window_handle)
    job_text = f"{job_title} // {job_company} // {job_location} // private\n"
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == job_text + orig_job_text)


def get_location(elt):
    job_location = log_class(wait_for(lambda: elt.find_elements(
        By.CSS_SELECTOR, location_selector))[0]).text
    workplaces = log_class(
        elt.find_elements(By.CSS_SELECTOR, workplace_selector), is_list=True)
    if workplaces:
        job_location = f"{job_location} ({workplaces[0].text})"
    return job_location


def wait_for(*funcs, timeout=10):
    sleep_for = 0.1
    start = time.time()
    while time.time() - start < timeout:
        for func in funcs:
            try:
                result = func()
            except NoSuchElementException:
                continue
            if result:
                return result
        time.sleep(sleep_for)
        sleep_for *= 2
    pdb.set_trace()


def find_first_active_job(driver):
    ordinal = 1
    for elt in log_class(driver.find_elements(By.CSS_SELECTOR, job_selector),
                         is_list=True):
        if elt.get_attribute("hidden") == "true":
            ordinal += 1
            continue
        if show_you_fewer in elt.get_attribute("innerText"):
            ordinal += 1
            continue
        return (ordinal, elt)


def find_job(driver, ordinal):
    for elt in driver.find_elements(By.CSS_SELECTOR, job_selector):
        ordinal -= 1
        if ordinal == 0:
            return elt
    return None


def find_hide_button(driver, elt, hidden_ok=False):
    if not (hidden_ok or elt.get_attribute("lijfState") == "visible"):
        return None
    elts = elt.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        label = elt.get_attribute("aria-label")
        if label and ("Hide" in label or "Dismiss" in label or
                      re.match(r'^Mark .* with Not for me', label)):
            return elt
    return None


def find_private_hide_button(driver, elt):
    return elt.find_element(By.CSS_SELECTOR, private_hide_selector)


def find_unhide_button(elt):
    elts = elt.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        if elt.text == "Undo":
            return elt
    return None


def log_class(elt, is_list=False):
    if elt:
        the_class = (elt[0] if is_list else elt).get_attribute("class")
        the_class = re.sub(r'\s+', ' ', the_class).strip()
        class_logger.info(the_class)
    return elt


if __name__ == "__main__":
    main()
