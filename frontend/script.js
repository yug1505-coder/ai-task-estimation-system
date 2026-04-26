const form = document.getElementById("taskForm");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const task_name = document.getElementById("task_name").value;
    const expected_time = document.getElementById("expected_time").value;
    const actual_time = document.getElementById("actual_time").value;

    const response = await fetch("http://localhost:3000/addTask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            task_name,
            expected_time,
            actual_time
        })
    });

    const data = await response.json();

    console.log(data);

    document.getElementById("responseMsg").innerText =
    `Task added successfully
    Type: ${data.estimation_type}
    Accuracy: ${data.accuracy}`;

});
