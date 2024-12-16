// Login Button Click Handler
document.getElementById("login-button").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (username && password) {
    loginUser(username, password); // Call the login function
  } else {
    alert("Please enter both username and password.");
  }
});

document.getElementById("decrease-size").addEventListener("click", () => {
  
  decrease();
});



function loginUser(username, password) {
  fetch("http://127.0.0.1:5000/users") // Get all users
    .then(response => response.json())
    .then(users => {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        // Simulate login success by storing the user ID
        sessionStorage.setItem("userId", user.id); // Save user ID in session storage

        // Check user role
        if (user.role === "admin") {
          // Redirect to Flask-Admin interface
          window.location.href = "http://127.0.0.1:5000/admin";
        } else if (user.role === "student") {
          document.getElementById("login-form").style.display = "none";
          document.getElementById("courses").style.display = "block";
          document.getElementById("logout-button").style.display = "block";
          fetchCourses(user.id);  // Fetch available courses
          fetchUserCourses(user.id); // Fetch enrolled courses
        } else if (user.role === "teacher") {
          document.getElementById("login-form").style.display = "none";
          document.getElementById("courses").style.display = "block";
          document.getElementById("logout-button").style.display = "block";
          fetchCoursesTeacher(username); // Fetch courses taught by the teacher
        }
      } else {
        alert("Invalid username or password.");
      }
    })
    .catch(err => console.error("Error fetching users:", err));
}

function fetchNameAndGrade(enrollment) {
  // Fetch the username and include grade information
  return fetch(`http://127.0.0.1:5000/users`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    })
    .then(users => {
      const user = users.find(u => u.id === enrollment.user_id); // Match user by ID
      if (user) {
        return { username: user.username, grade: enrollment.grade, enrollmentID: enrollment.enrollment_id }; // Return both username and grade
      }
      throw new Error(`User with ID ${enrollment.user_id} not found`);
    })
    .catch(err => {
      console.error(`Error fetching user name for ID ${enrollment.user_id}:`, err);
      return { username: "Unknown", grade: "N/A", enrollmentID: "unknown" }; // Fallback values
    });
}

function fetchStudents(courseID) {
  return fetch(`http://127.0.0.1:5000/enrollments`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch enrollments");
      }
      return response.json();
    })
    .then(enrollments => {
      const courseEnrollments = enrollments.filter(e => e.course_id === courseID);
      console.log("Enrollments for Course ID", courseID, courseEnrollments); // Debugging
      return Promise.all(
        courseEnrollments.map(fetchNameAndGrade) // Fetch username and grade
      );
    })
    .catch(err => {
      console.error(`Error fetching students for course ID ${courseID}:`, err);
      return [];
    });
}

function updateGrade(enrollmentID, newGrade) {
  // Send the updated grade to the server
  return fetch(`http://127.0.0.1:5000/enrollments/${enrollmentID}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade: newGrade })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to update grade");
      }
      return response.json();
    })
    .then(data => {
      console.log("Grade updated successfully:", data);
    })
    .catch(err => {
      console.error("Error updating grade:", err);
    });
}

function fetchCoursesTeacher(username) {
  fetch(`http://127.0.0.1:5000/courses`)
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }
      return response.json();
    })
    .then(courses => {
      const courseList = document.getElementById("user-course-list");
      courseList.innerHTML = ""; // Clear previous list

      if (courses.length > 0) {
        courses.forEach(course => {
          if (course.teacher === username) {
            const courseItem = document.createElement("li");
            courseItem.textContent = `${course.name} - Time: ${course.start_time} to ${course.end_time}`;
            
            // Create a nested list for students
            const studentList = document.createElement("ul");

            // Fetch and append students
            fetchStudents(course.id)
              .then(studentDetails => {
                if (studentDetails.length > 0) {
                  studentDetails.forEach(({ username, grade, enrollmentID }) => {
                    const studentItem = document.createElement("li");
                    
                    // Display student name and grade
                    studentItem.innerHTML = `
                      ${username} - Grade: 
                      <input 
                        type="text" 
                        value="${grade !== null ? grade : 'Not graded'}" 
                        data-enrollment-id="${enrollmentID}" 
                        style="width: 50px;"
                      />
                      <button data-enrollment-id="${enrollmentID}">Update</button>
                    `;

                    // Add event listener to update button
                    const updateButton = studentItem.querySelector("button");
                    updateButton.addEventListener("click", () => {
                      const inputField = studentItem.querySelector("input");
                      const newGrade = inputField.value;
                      const enrollmentID = updateButton.getAttribute("data-enrollment-id");

                      // Update grade in the database
                      updateGrade(enrollmentID, newGrade).then(() => {
                        alert(`Grade updated to: ${newGrade}`);
                      });
                    });

                    studentList.appendChild(studentItem);
                  });
                } else {
                  const noStudents = document.createElement("li");
                  noStudents.textContent = "No students enrolled.";
                  studentList.appendChild(noStudents);
                }
              })
              .catch(err => console.error("Error fetching students:", err));

            // Append the nested list to the course item
            courseItem.appendChild(studentList);
            courseList.appendChild(courseItem);
          }
        });
      } else {
        courseList.innerHTML = "<li>No courses found</li>";
      }
    })
    .catch(err => console.error("Error fetching courses:", err));
}

// Fetch Enrolled Courses for the User
function fetchUserCourses(userId) {
  fetch(`http://127.0.0.1:5000/users/${userId}/courses`)
    .then(response => response.json())
    .then(courses => {
      const courseList = document.getElementById("user-course-list");
      courseList.innerHTML = ""; // Clear previous list

      if (courses.length > 0) {
        courses.forEach(course => {
          const li = document.createElement("li");
          li.textContent = `${course.name} - Time: ${course.start_time} to ${course.end_time}`;
          courseList.appendChild(li);
        });
      } else {
        courseList.innerHTML = "<li>No enrolled courses</li>";
      }
    })
    .catch(err => console.error("Error fetching user courses:", err));
}



function decrease() {
  fetch("http://127.0.0.1:5000/courses") // Fetch all courses
    .then(response => response.json())
    .then(courses => {
      courses.forEach(course => {
        // Check if course capacity is greater than zero
        if (course.capacity > 0) {
          // Decrease capacity by 1
          const updatedCapacity = course.capacity - 1;

          // Send PUT request to update course capacity
          fetch(`http://127.0.0.1:5000/courses/${course.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ capacity: updatedCapacity })
          })
          .then(response => {
            if (response.ok) {
              console.log(`Course ${course.name} capacity reduced to ${updatedCapacity}`);
            } else {
              console.error(`Failed to update capacity for course ${course.name}`);
            }
          })
          .catch(err => console.error("Error updating course capacity:", err));
        } else {
          console.log(`Course ${course.name} already has zero capacity`);
        }
      });
    })
    .catch(err => console.error("Error fetching courses:", err));
}

// Logout Function
document.getElementById("logout-button").addEventListener("click", () => {
  // Clear session storage
  sessionStorage.removeItem("userId");

  // Hide the courses section and logout button
  document.getElementById("courses").style.display = "none";
  document.getElementById("logout-button").style.display = "none";

  // Show the login form
  document.getElementById("login-form").style.display = "block";

  // Clear enrolled courses and available courses
  document.getElementById("user-course-list").innerHTML = ""; // Clear enrolled courses list
  document.getElementById("course-list").innerHTML = "";      // Clear available courses list

  alert("You have been logged out!");
});

function fetchCourses(userId) {
  fetch("http://127.0.0.1:5000/courses")
    .then(response => response.json())
    .then(courses => {
      const courseList = document.getElementById("course-list");
      courseList.innerHTML = "";

      courses.forEach(course => {
        const li = document.createElement("li");

        // Course details
        li.textContent = `${course.name} (Capacity: ${course.capacity}) - Time: ${course.start_time} to ${course.end_time} - Enrolled: ${course.nofstudents} out of ${course.capacity}`;

        // Add "Enroll" button
        const enrollButton = document.createElement("button");
        enrollButton.textContent = "Add Class";
        enrollButton.style.marginLeft = "10px";

        // Check if the course is full
        if (course.nofstudents >= course.capacity) {
          enrollButton.disabled = true;
          enrollButton.textContent = "Class Full";
        }

        // Add event listener to enroll button
        enrollButton.addEventListener("click", () => {
          addClass(userId, course.id);
        });
        console.log(userId);

        li.appendChild(enrollButton);
        courseList.appendChild(li);
      });
    })
    .catch(err => console.error("Error fetching courses:", err));
}


function addClass(userId, courseId) {
  // POST request to enroll the user
  console.log(userId)
  console.log(userId)
  fetch(`http://127.0.0.1:5000/enroll/${userId}/${courseId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ course_id: courseId }) // Send course ID if required by the backend
  })
    .then(response => {
      if (response.ok) {
        alert("Successfully enrolled in the class!");
        fetchCourses(userId); // Refresh available courses
        fetchUserCourses(userId); // Refresh user's enrolled courses
      } else {
        alert("Failed to enroll in the class.");
      }
    })
    .catch(err => console.error("Error enrolling in the class:", err));
}

function showTab(tabId) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach(tab => {
    tab.style.display = tab.id === tabId ? "block" : "none";
  });
}


function getCurrentUserId() {
  // Mock function for now; replace with actual user session logic
  return 1; // Assuming user ID 1 for testing
}
  function showSection(sectionId) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => content.style.display = 'none');

  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => button.classList.remove('active'));

  // Show the selected section and highlight the corresponding button
  document.getElementById(sectionId).style.display = 'block';
  document.querySelector(`[onclick="showSection('${sectionId}')"]`).classList.add('active');
}