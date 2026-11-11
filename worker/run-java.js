export async function onRequestPost(
    context
) {

    const body =
        await context.request.json();

    const response =
        await fetch(
            "YOUR_JUDGE0_ENDPOINT",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "X-API-Key":
                        "YOUR_API_KEY"
                },

                body: JSON.stringify({
                    language_id: 62,
                    source_code: body.code
                })
            }
        );

    const result =
        await response.json();

    return Response.json(result);
}