import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { render, screen } from "@testing-library/react";

describe("Card", () => {
  it("renders Card correctly", () => {
    render(<Card data-testid="card">Card content</Card>);
    expect(screen.getByTestId("card")).toBeInTheDocument();
    expect(screen.getByText(/card content/i)).toBeInTheDocument();
  });

  it("renders with all subcomponents", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Main Content</CardContent>
        <CardFooter>Footer Content</CardFooter>
      </Card>,
    );

    expect(screen.getByText(/test title/i)).toBeInTheDocument();
    expect(screen.getByText(/test description/i)).toBeInTheDocument();
    expect(screen.getByText(/main content/i)).toBeInTheDocument();
    expect(screen.getByText(/footer content/i)).toBeInTheDocument();
  });

  it("applies custom className to Card", () => {
    render(
      <Card className="custom-card" data-testid="card">
        Content
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveClass("custom-card");
  });

  it("applies custom className to CardHeader", () => {
    render(
      <Card>
        <CardHeader className="custom-header" data-testid="header">
          Header
        </CardHeader>
      </Card>,
    );
    expect(screen.getByTestId("header")).toHaveClass("custom-header");
  });

  it("applies custom className to CardContent", () => {
    render(
      <Card>
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      </Card>,
    );
    expect(screen.getByTestId("content")).toHaveClass("custom-content");
  });

  it("applies custom className to CardFooter", () => {
    render(
      <Card>
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>
      </Card>,
    );
    expect(screen.getByTestId("footer")).toHaveClass("custom-footer");
  });

  it("has proper semantic structure", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>,
    );

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Title");
  });
});
