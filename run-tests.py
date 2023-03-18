#!/usr/bin/env python3

import re
from selenium import webdriver
from selenium.webdriver.common.by import By
import tempfile
import time
import yaml

config_file = "test-config.yml"


def main():
    config = yaml.load(open(config_file), yaml.Loader)
    with tempfile.TemporaryDirectory() as user_data_directory:
        options = webdriver.ChromeOptions()
        options.add_argument(f"user-data-dir={user_data_directory}")
        options.add_extension("LinkedInJobsFilterer.zip")
        driver = webdriver.Chrome(options=options)
        run_tests(config, driver)
        driver.quit()


def run_tests(config, driver):
    # Did the changelog page load on install?
    start = time.time()
    while len(driver.window_handles) == 1 and time.time() - start < 1:
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
    driver.get(f"chrome-extension://{extension_id}/options.html")
    driver.find_element(By.ID, "hideJobs")
    options_window_handle = driver.current_window_handle

    # Log into LinkedIn
    driver.switch_to.new_window("tab")
    linkedin_window_handle = driver.current_window_handle
    driver.get("https://www.linkedin.com/login")
    driver.find_element(By.ID, "username").send_keys(
        config["linkedin_username"])
    driver.find_element(By.ID, "password").send_keys(
        config["linkedin_password"])
    driver.find_element(By.XPATH, "//*[@aria-label='Sign in']").click()
    try:
        mfa_field = driver.find_element(By.ID, "input__phone_verification_pin")
    except Exception:
        pass
    else:
        mfa_code = input("Enter MFA code: ")
        mfa_field.send_keys(mfa_code)
        driver.find_element(By.ID, "two-step-submit-button").click()

    # Can we find and hide a job?
    driver.get("https://www.linkedin.com/jobs")
    first_job = wait_for(
        lambda: driver.find_element(By.CSS_SELECTOR,
                                    ".jobs-job-board-list__item"))
    job_title = wait_for(
        lambda: first_job.find_element(By.CSS_SELECTOR,
                                       ".job-card-list__title"))
    job_company = first_job.find_element(
        By.CSS_SELECTOR,
        ".job-card-container__primary-description, "
        ".job-card-container__company-name")
    job_location = first_job.find_element(By.CSS_SELECTOR,
                                          ".job-card-container__metadata-item")
    hide_button = find_hide_button(driver, first_job)
    hide_button.click()

    # Is the job we just hid now in the options?
    driver.switch_to.window(options_window_handle)
    job_text = f"{job_title} // {job_company} // {job_location}\n"
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == job_text)

    # Can we find an unhide the same job?
    driver.switch_to.window(linkedin_window_handle)
    first_job = driver.find_element(By.CSS_SELECTOR,
                                    ".jobs-job-board-list__item")
    unhide_button = wait_for(lambda: find_unhide_button(driver, first_job))
    unhide_button.click()

    # Does the unhidden job get removed from the options page?
    driver.switch_to.window(options_window_handle)
    wait_for(lambda: driver.find_element(By.ID, "jobs").
             get_attribute("value") == "")


def wait_for(func, value=None):
    sleep_for = 0.1
    start = time.time()
    limit = 10
    while time.time() - start < limit:
        try:
            result = func()
            if value is not None and result != value:
                raise Exception("Nope")
        except Exception:
            time.sleep(sleep_for)
            sleep_for *= 2
        else:
            return result
    raise Exception("Timeout")


def find_hide_button(driver, elt):
    elts = driver.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        label = elt.get_attribute("aria-label")
        if label and ("Hide" in label or "Dismiss" in label):
            return elt
    raise Exception("Couldn't find hide button")


def find_unhide_button(driver, elt):
    elts = driver.find_elements(By.TAG_NAME, "button")
    for elt in elts:
        if elt.text == "Undo":
            return elt
    raise Exception("Couldn't find unhide button")


if __name__ == '__main__':
    main()
