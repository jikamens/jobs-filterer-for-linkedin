#!/usr/bin/env python3

import argparse
import re
from selenium import webdriver
from selenium.common.exceptions import (
    ElementClickInterceptedException,
    NoSuchElementException,
)
from selenium.webdriver.common.by import By
import tempfile
import time
import yaml

config_file = "test-config.yml"
job_selector = ".jobs-search-results__list-item, .jobs-job-board-list__item"
title_selector = ".job-card-list__title"
company_selector = (".job-card-container__primary-description, "
                    ".job-card-container__company-name")
location_selector = ".job-card-container__metadata-item"


def parse_args():
    parser = argparse.ArgumentParser(description="Test LinkedIn Jobs Filterer")
    parser.add_argument("--headless", action="store_true", default=False)
    return parser.parse_args()


def main():
    config = yaml.load(open(config_file), yaml.Loader)
    args = parse_args()
    with tempfile.TemporaryDirectory() as user_data_directory:
        options = webdriver.ChromeOptions()
        if args.headless:
            options.add_argument("headless=new")
        # Needs to be big enough to prevent the Messaging banner from obscuring
        # the first listed job even when Messaging is hidden.
        options.add_argument("window-size=1280,1024")
        options.add_argument(f"user-data-dir={user_data_directory}")
        options.add_extension("LinkedInJobsFilterer-test.zip")
        driver = webdriver.Chrome(options=options)
        run_tests(config, driver)
        driver.quit()


def run_tests(config, driver):
    # Did the changelog page load on install?
    start = time.time()
    while len(driver.window_handles) == 1 and time.time() - start < 2:
        time.sleep(0.1)
    driver.switch_to.window(driver.window_handles[1])

    # Does the changelog page have expected content?
    assert "change history" in driver.page_source
    match = re.match(r"chrome-extension://(.*)/changes\.html$",
                     driver.current_url)
    extension_id = match[1]

    # Can we load the help page with expected content?
    driver.get(f"chrome-extension://{extension_id}/help.html")
    assert "Example workflow" in driver.page_source

    # Can we load the options page with expected content?
    options_page = f"chrome-extension://{extension_id}/options.html"
    driver.get(options_page)
    driver.find_element(By.ID, "hideJobs")
    options_window_handle = driver.current_window_handle

    driver.find_element(By.ID, "titles").send_keys("TitleRegexp")
    driver.find_element(By.ID, "companies").send_keys("CompanyRegexp")
    driver.find_element(By.ID, "locations").send_keys("LocationRegexp")
    driver.find_element(By.ID, "jobs").send_keys(
        "Title // Company // Location")
    driver.find_element(By.ID, "save").click()
    wait_for(lambda: "Options saved" in
             driver.find_element(By.ID, "status").get_attribute("innerText"))
    driver.switch_to.new_window("tab")
    driver.get(options_page)
    wait_for(lambda: driver.find_element(By.ID, "titles").
             get_attribute("value") == "TitleRegexp\n")
    driver.find_element(By.ID, "jobs").clear()
    driver.find_element(By.ID, "save").click()
    wait_for(lambda: "Options saved" in
             driver.find_element(By.ID, "status").get_attribute("innerText"))
    driver.close()

    # Run JavaScript tests
    driver.switch_to.window(options_window_handle)
    test_load_script = """
        var tests;
        await (async () => {
            const src = chrome.runtime.getURL("tests.js");
            tests = await import(src);
        })();
        return await tests.runTests();
    """
    test_result = driver.execute_script(test_load_script)
    if test_result != "success":
        print("JavaScript tests failed")
        import pdb
        pdb.set_trace()

    # Log into LinkedIn
    driver.switch_to.new_window("tab")
    linkedin_window_handle = driver.current_window_handle
    driver.get("https://www.linkedin.com/login")
    driver.find_element(By.ID, "username").send_keys(
        config["linkedin_username"])
    driver.find_element(By.ID, "password").send_keys(
        config["linkedin_password"])
    driver.find_element(By.XPATH, "//*[@aria-label='Sign in']").click()

    state = None
    while state != "homepage":
        (state, elt) = wait_for(
            lambda: ("2fa", driver.find_element(
                By.ID, "input__phone_verification_pin")),
            lambda: ("captcha", driver.find_element(
                By.ID, "captcha-internal")),
            lambda: ("challenge", driver.find_element(
                By.NAME, "challengeType")),
            lambda: ("homepage", driver.find_element(
                By.PARTIAL_LINK_TEXT, "Notifications"))
        )
        if state == "2fa":
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
            "keywords=Quality%20Assurance%20Engineer",
            linkedin_window_handle, options_window_handle)
    except ElementClickInterceptedException:
        fn = "/tmp/litest_screenshot.png"
        driver.save_screenshot(fn)
        print(f"Element click intercepted, screenshot saved in {fn}")
        raise


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
    # Can we find and hide a job?
    driver.switch_to.window(linkedin_window_handle)
    driver.get(url)
    hide_messaging(driver)
    # We need to wait until we see the first job _title_ before we look for
    # the first _job_ because empty jobs show up temporarily on the page and
    # are then replaced by the real ones with contents (like job title).
    titles = wait_for(lambda: driver.find_elements(
        By.CSS_SELECTOR, title_selector))

    # Wait for the page to "settle", i.e., wait until two seconds go by with
    # the set of job title elements not changing.
    start = time.time()
    while time.time() - start < 2:
        new_titles = wait_for(lambda: driver.find_elements(
            By.CSS_SELECTOR, title_selector))
        if titles != new_titles:
            titles = new_titles
            start = time.time()

    first_job = wait_for(lambda: driver.find_elements(
        By.CSS_SELECTOR, job_selector))[0]
    job_title = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, title_selector))[0].text
    job_company = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, company_selector))[0].text
    job_location = wait_for(lambda: first_job.find_elements(
        By.CSS_SELECTOR, location_selector))[0].text
    time.sleep(1)  # Make sure the extension has had time to wire the button.
    hide_button = wait_for(lambda: find_hide_button(driver, first_job))
    hide_button.click()

    # Is the job we just hid now in the options?
    driver.switch_to.window(options_window_handle)
    job_text = f"{job_title} // {job_company} // {job_location}\n"
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == job_text)

    # Can we find and unhide the same job?
    driver.switch_to.window(linkedin_window_handle)
    time.sleep(1)  # Make sure the extension has had time to wire the button.
    unhide_button = wait_for(lambda: find_unhide_button(driver, driver))
    unhide_button.click()

    # Does the unhidden job get removed from the options page?
    driver.switch_to.window(options_window_handle)
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == "")


def wait_for(*funcs):
    sleep_for = 0.1
    start = time.time()
    limit = 10
    while time.time() - start < limit:
        for func in funcs:
            try:
                result = func()
            except NoSuchElementException:
                continue
            if result:
                return result
        time.sleep(sleep_for)
        sleep_for *= 2
    raise Exception("Timeout")


def find_hide_button(driver, elt):
    elts = elt.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        label = elt.get_attribute("aria-label")
        if label and ("Hide" in label or "Dismiss" in label):
            return elt
    return None


def find_unhide_button(driver, elt):
    elts = elt.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        if elt.text == "Undo":
            return elt
    return None


if __name__ == "__main__":
    main()
